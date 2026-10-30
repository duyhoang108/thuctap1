import {
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { UserProfileDto } from "./user-profile.dto";

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: "Tên phải là một chuỗi" })
  @MaxLength(100, { message: "Tên không được quá 100 ký tự" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MinLength(1, { message: "Tên không được để trống" })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(72, { message: "Mật khẩu không được quá 72 ký tự" })
  @MinLength(8, { message: "Mật khẩu phải có ít nhất 8 ký tự" })
  @Matches(
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        "Mật khẩu phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường, một số và một ký tự đặc biệt",
    },
  )
  password?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile?: UserProfileDto;
}
