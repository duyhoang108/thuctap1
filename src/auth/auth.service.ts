import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { User } from "./entities/user.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { UpdateUserDto } from "./dto/update-user.dto";
import { PaginationDto } from "./dto/pagination.dto";
import { RedisService } from "../cache/redis.service";

type PublicUser = {
  id: number;
  name: string;
  email: string;
  profile: {
    id: number;
    phone: string | null;
    dateOfBirth: string | null;
    gender: string | null;
  } | null;
};

type UserListResponse = {
  data: PublicUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profilesRepository: Repository<UserProfile>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException("Email đã tồn tại trong hệ thống.");
      }

      const hashedPassword = await bcrypt.hash(registerDto.password, 12);

      const newUser = queryRunner.manager.create(User, {
        name: registerDto.name.trim(),
        email,
        password: hashedPassword,
      });

      const savedUser = await queryRunner.manager.save(User, newUser);

      if (registerDto.profile) {
        const profile = queryRunner.manager.create(UserProfile, {
          ...registerDto.profile,
          user: savedUser,
        });
        await queryRunner.manager.save(UserProfile, profile);
        savedUser.profile = profile;
      }

      await queryRunner.commitTransaction();
      await this.invalidateUserCaches();

      return {
        message: "Đăng ký tài khoản thành công",
        user: this.toPublicUser(savedUser),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException(
        "Đã xảy ra lỗi trong quá trình đăng ký tài khoản.",
      );
    } finally {
      await queryRunner.release();
    }
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();

    const user = await this.usersRepository.findOne({
      where: { email },
      select: ["id", "name", "email", "password", "role"],
    });

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException("Email hoặc mật khẩu không chính xác.");
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const accessToken = await this.createAccessToken(payload);
    const refreshToken = await this.createRefreshToken(payload);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: this.configService.getOrThrow<string>("JWT_EXPIRES_IN"),
      refresh_expires_in: this.configService.getOrThrow<string>(
        "JWT_REFRESH_EXPIRES_IN",
      ),
      user: this.toPublicUser(user),
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
        },
      );

      if (payload.tokenType !== "refresh") {
        throw new UnauthorizedException("Refresh token không hợp lệ.");
      }

      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException(
          "Tài khoản không tồn tại hoặc đã bị xóa.",
        );
      }

      const accessToken = await this.createAccessToken({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      });
      const newRefreshToken = await this.createRefreshToken({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      });

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        token_type: "Bearer",
        expires_in: this.configService.getOrThrow<string>("JWT_EXPIRES_IN"),
        refresh_expires_in: this.configService.getOrThrow<string>(
          "JWT_REFRESH_EXPIRES_IN",
        ),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(
        "Refresh token không hợp lệ hoặc đã hết hạn.",
      );
    }
  }

  async findAllUsers({ page, limit }: PaginationDto, requesterId: number) {
    const version =
      (await this.redisService.get<string>(this.userCacheVersionKey)) ?? "1";
    const cacheKey = `users:list:${requesterId}:${version}:${page}:${limit}`;
    const cached = await this.redisService.get<UserListResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    const [users, total] = await this.usersRepository.findAndCount({
      where: { id: requesterId },
      take: 1,
    });

    const result: UserListResponse = {
      data: users.map((user) => this.toPublicUser(user)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
    await this.redisService.set(
      cacheKey,
      result,
      this.configService.getOrThrow<number>("REDIS_CACHE_TTL"),
    );
    return result;
  }

  async findUserById(id: number, requesterId: number) {
    this.assertOwner(id, requesterId);

    const cacheKey = `users:detail:${id}`;
    const cached = await this.redisService.get<PublicUser>(cacheKey);

    if (cached) {
      return cached;
    }

    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng.");
    }

    const result = this.toPublicUser(user);
    await this.redisService.set(
      cacheKey,
      result,
      this.configService.getOrThrow<number>("REDIS_CACHE_TTL"),
    );
    return result;
  }

  async updateUser(
    id: number,
    updateUserDto: UpdateUserDto,
    requesterId: number,
  ) {
    this.assertOwner(id, requesterId);

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng.");
    }

    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name.trim();
    }

    if (updateUserDto.password !== undefined) {
      user.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    if (updateUserDto.profile !== undefined) {
      const profile = user.profile ?? this.profilesRepository.create({ user });
      Object.assign(profile, updateUserDto.profile);
      await this.profilesRepository.save(profile);
      user.profile = profile;
    }

    const savedUser = await this.usersRepository.save(user);
    await this.invalidateUserCaches(id);

    return {
      message: "Cập nhật thông tin người dùng thành công.",
      user: this.toPublicUser(savedUser),
    };
  }

  async deleteUser(id: number, requesterId: number) {
    this.assertOwner(id, requesterId);

    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException("Không tìm thấy người dùng.");
    }

    if (user.profile) {
      await this.profilesRepository.remove(user.profile);
    }
    await this.usersRepository.remove(user);
    await this.invalidateUserCaches(id);

    return {
      message: "Xóa người dùng thành công.",
      user: this.toPublicUser(user),
    };
  }

  private createAccessToken(payload: Omit<JwtPayload, "iat" | "exp">) {
    return this.jwtService.signAsync({
      ...payload,
      tokenType: "access",
    });
  }

  private createRefreshToken(payload: Omit<JwtPayload, "iat" | "exp">) {
    return this.jwtService.signAsync(
      {
        ...payload,
        tokenType: "refresh",
      },
      {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.configService.getOrThrow<string>(
          "JWT_REFRESH_EXPIRES_IN",
        ) as `${number}${"s" | "m" | "h" | "d"}`,
      },
    );
  }

  private readonly userCacheVersionKey = "users:cache-version";

  private async invalidateUserCaches(id?: number) {
    await this.redisService.increment(this.userCacheVersionKey);
    if (id !== undefined) {
      await this.redisService.delete(`users:detail:${id}`);
    }
  }

  private assertOwner(id: number, requesterId: number) {
    if (id !== requesterId) {
      throw new ForbiddenException(
        "Bạn chỉ được thao tác trên tài khoản của mình.",
      );
    }
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile
        ? {
            id: user.profile.id,
            phone: user.profile.phone,
            dateOfBirth: user.profile.dateOfBirth,
            gender: user.profile.gender,
          }
        : null,
    };
  }
}
