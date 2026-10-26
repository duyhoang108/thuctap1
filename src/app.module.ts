import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "./auth/auth.module";
import { CacheModule } from "./cache/cache.module";
import { validateEnvironment } from "./config/env.validation";

@Module({
  imports: [
    //5. ConfigModule.forRoot() làm gì?
    //ConfigModule.forRoot() là một phương thức của @nestjs/config để cấu hình module config.
    ConfigModule.forRoot({
      /* đọc .env Nest js sẽ tìm file .env và đọc 
      PORT=3000
      JWT_SECRET=...
      JWT_EXPIRES_IN=1d Sau đó đưa các giá trị vào vùng cấu hình của ứng dụng.*/
      isGlobal: true,
      // Bước 1: isGlobal: true
      // Cho phép các module khác dùng ConfigService mà không phải import lại ConfigModule.
      validate: validateEnvironment,
      //Bước 2: Chạy hàm validate
      /*Nghĩa là: Sau khi đọc .env,
      hãy đưa toàn bộ biến môi trường vào hàm validateEnvironment để kiểm tra. */
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: "default",
          ttl: configService.getOrThrow<number>("RATE_LIMIT_TTL"),
          limit: configService.getOrThrow<number>("RATE_LIMIT_LIMIT"),
        },
      ],
    }),
    TypeOrmModule.forRoot({
      type: "sqlite",
      database: "data.sqlite",
      autoLoadEntities: true,
      synchronize: true,
    }),
    CacheModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
