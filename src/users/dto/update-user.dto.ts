import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { UserProfileDto } from "./user-profile.dto";
import { PASSWORD_REGEX } from "../../auth/constants/password";

export class UpdateUserDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString({ message: "Tên phải là một chuỗi" })
  @MaxLength(100, { message: "Tên không được quá 100 ký tự" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MinLength(1, { message: "Tên không được để trống" })
  name?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(72, { message: "Mật khẩu không được quá 72 ký tự" })
  @MinLength(8, { message: "Mật khẩu phải có ít nhất 8 ký tự" })
  @Matches(PASSWORD_REGEX, {
    message:
      "Mật khẩu phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường, một số và một ký tự đặc biệt",
  })
  password?: string;

  @ValidateIf((_, value) => value !== undefined)
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile?: UserProfileDto;

  @ValidateIf((_, value) => value !== undefined)
  @IsString({ message: "Mật khẩu hiện tại phải là chuỗi" })
  @IsNotEmpty({ message: "Mật khẩu hiện tại không được để trống" })
  @MaxLength(72, { message: "Mật khẩu hiện tại không được quá 72 ký tự" })
  currentPassword?: string;
}
