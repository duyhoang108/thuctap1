import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { User } from "../users/entities/user.entity";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { UserProfile } from "../users/entities/user-profile.entity";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
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
      await this.usersService.invalidateCaches();

      return {
        message: "Đăng ký tài khoản thành công",
        user: this.usersService.toPublicUser(savedUser),
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
      user: this.usersService.toPublicUser(user),
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
}
