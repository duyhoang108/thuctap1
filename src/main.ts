import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config"; // đã thêm
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  //sau khi tạo app
  const configService = app.get(ConfigService);
  //lấy ConfigService từ app để đọc biến môi trường
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  //await app.listen(3000); //Port bị viết trực tiếp trong source code.
  //Vấn đề 1: Port bị hard-code
  //Muốn đổi port phải sửa code:
  //await app.listen(4000);
  //Đây không phải cách tốt vì config môi trường nên nằm bên ngoài source code.
  //Vấn đề 2: JWT secret có secret mặc định
  //Nếu quên cấu hình JWT_SECRET, app sẽ dùng: 'dev-only-secret-change-me'
  await app.listen(configService.getOrThrow<number>("PORT"));
  //Lấy biến PORT đã được validate từ ConfigService và mở server ở port đó.
  // Nếu .evn là port=3000 chạy ở : http://localhost:3000 nếu đổi thành
  // .env là port=4000 chạy ở : http://localhost:4000 không cần sửa main.ts
}

void bootstrap();
