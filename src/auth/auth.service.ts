import {
  ConflictException,
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
    date_of_birth: string | null;
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
    private readonly dataSource: DataSource, // Dùng để quản lý Transaction khi cần thiết
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Đăng ký tài khoản mới với xử lý transaction và chuẩn hóa dữ liệu chặt chẽ
   */
  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();

    // Sử dụng transaction để đảm bảo an toàn dữ liệu nếu mở rộng nghiệp vụ phức tạp hơn sau này
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect(); //Kết nối tới pool database.
    await queryRunner.startTransaction(); //Bắt đầu một phiên giao dịch biệt lập.

    try {
      // Kiểm tra xem email đã tồn tại hay chưa bằng EntityManager của transaction
      const existingUser = await queryRunner.manager.findOne(User, {
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException("Email đã tồn tại trong hệ thống.");
      }

      // Hash mật khẩu với độ an toàn cao (salt rounds = 12 thay vì 10 cho production)
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

      // Commit transaction nếu mọi thứ thành công
      await queryRunner.commitTransaction();
      await this.invalidateUserCaches();

      return {
        message: "Đăng ký tài khoản thành công",
        user: this.toPublicUser(savedUser),
      };
    } catch (error) {
      // Rollback lại database nếu có bất kỳ lỗi nào xảy ra
      await queryRunner.rollbackTransaction();

      // Nếu là ngoại lệ HTTP do NestJS chủ động ném ra (như ConflictException), giữ nguyên để trả về client
      if (error instanceof ConflictException) {
        throw error;
      }

      // Các lỗi hệ thống khác log lại và trả về 500
      throw new InternalServerErrorException(
        "Đã xảy ra lỗi trong quá trình đăng ký tài khoản.",
      );
    } finally {
      // Giải phóng queryRunner sau khi hoàn thành
      await queryRunner.release();
    }
  }

  /**
   * Đăng nhập hệ thống, cấp phát JWT Access Token với thông tin payload tối ưu
   */
  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();

    // Tìm kiếm user kèm theo mật khẩu (đảm bảo cột password trong Entity không bị ẩn mặc định select: false)
    const user = await this.usersRepository.findOne({
      where: { email },
      select: ["id", "name", "email", "password"],
    });

    // Kiểm tra tài khoản tồn tại và so sánh mật khẩu khớp nhau
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      // Thông báo lỗi chung chung nhằm tránh kẻ xấu dò tìm (Account Enumeration)
      throw new UnauthorizedException("Email hoặc mật khẩu không chính xác.");
    }

    // Xây dựng Payload cho JWT (có thể bổ sung roles/permissions tùy ý)
    // payload là dữ liệu muốn đưa vào token
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };
    /* Sau đó JwtService lấy:
      Payload.
      JWT_SECRET.
      Thời gian hết hạn.
      Rồi tạo access token.
      Ví dụ token:eyJhbGciOiJIUzI1NiIs...
      JWT thường có cấu trúc: Header.Payload.Signature ví dụ: xxxxx.yyyyy.zzzzz
      Header: Cho biết thuật toán ký.
      Payload: Chứa dữ liệu muốn đưa vào token.
      Signature: Ký bằng secret để đảm bảo token không bị giả mạo.
      Khi client gửi token lên server, server sẽ: kiểm tra signature,
      giải mã payload để lấy thông tin người dùng. nếu signature không hợp lệ
       => token giả mạo => từ chối truy cập.

  */
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

      if (payload.token_type !== "refresh") {
        throw new UnauthorizedException("Refresh token không hợp lệ.");
      }

      const accessToken = await this.createAccessToken({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      });
      const newRefreshToken = await this.createRefreshToken({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
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

  async findAllUsers({ page, limit }: PaginationDto) {
    const version =
      (await this.redisService.get<string>(this.userCacheVersionKey)) ?? "1";
    const cacheKey = `users:list:${version}:${page}:${limit}`;
    const cached = await this.redisService.get<UserListResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    const [users, total] = await this.usersRepository.findAndCount({
      order: { id: "ASC" },
      skip: (page - 1) * limit,
      take: limit,
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

  async findUserById(id: number) {
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

  async updateUser(id: number, updateUserDto: UpdateUserDto) {
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

  async deleteUser(id: number) {
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
      token_type: "access",
    });
  }

  private createRefreshToken(payload: Omit<JwtPayload, "iat" | "exp">) {
    return this.jwtService.signAsync(
      {
        ...payload,
        token_type: "refresh",
      },
      {
        secret: this.configService.getOrThrow<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.configService.getOrThrow<string>(
          "JWT_REFRESH_EXPIRES_IN",
        ) as `${number}${"s" | "m" | "h" | "d"}`,
      },
    );
  }

  /**
   * Phương thức chuyển đổi dữ liệu user sang dạng an toàn công khai (loại bỏ password)
   */
  private readonly userCacheVersionKey = "users:cache-version";

  private async invalidateUserCaches(id?: number) {
    await this.redisService.increment(this.userCacheVersionKey);
    if (id !== undefined) {
      await this.redisService.delete(`users:detail:${id}`);
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
            date_of_birth: user.profile.date_of_birth,
            gender: user.profile.gender,
          }
        : null,
    };
  }
}
