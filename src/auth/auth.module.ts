import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { User } from "./entities/user.entity";
import { UserProfile } from "./entities/user-profile.entity";
import { ProfileController } from "./profile.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserProfile]),
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.getOrThrow<string>(
            "JWT_EXPIRES_IN",
          ) as `${number}${"s" | "m" | "h" | "d"}`,
        },
      }),
    }),
  ],
  /* 15. Vì sao phải đăng ký ProfileController?    */
  controllers: [AuthController, ProfileController],
  //NestJS chỉ tạo route cho những controller được khai báo trong module.
  // nếu chỉ viết file profile.controller.ts mà không khai báo ProfileController trong module, NestJS sẽ không tạo route /profile.
  providers: [AuthService],
})
export class AuthModule {}
