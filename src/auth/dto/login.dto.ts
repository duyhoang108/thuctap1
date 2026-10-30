import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: `Email không hợp lệ` })
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsString()
  @IsNotEmpty({ message: "Mật khẩu không được để trống" })
  @MaxLength(72, { message: "Mật khẩu không được quá 72 ký tự" })
  password: string;
}
