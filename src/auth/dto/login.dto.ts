// src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength, Matches } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: `Email không hợp lệ` })
  email: string;

  @IsString()
  @MinLength(8, { message: `Mật khẩu phải có ít nhất 8 ký tự` })
  @Matches(
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message: `Mật khẩu phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường, một số và một ký tự đặc biệt`,
    },
  )
  password: string;
}
