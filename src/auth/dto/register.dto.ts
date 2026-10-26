import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { UserProfileDto } from "./user-profile.dto";

export class RegisterDto {
  @IsNotEmpty({ message: `Tên không được để trống` })
  @IsString({ message: `Tên phải là một chuỗi` })
  name: string;

  @IsNotEmpty({ message: `Email không được để trống` })
  @IsEmail({}, { message: `Email không đúng định dạng` })
  email: string;

  @IsNotEmpty({ message: `Mật khẩu không được để trống` })
  @IsString()
  @MinLength(8, { message: `Mật khẩu phải có ít nhất 8 ký tự` })
  @Matches(
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message: `Mật khẩu phải chứa ít nhất một chữ cái viết hoa, một chữ cái viết thường, một số và một ký tự đặc biệt`,
    },
  )
  password: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserProfileDto)
  profile?: UserProfileDto;
}
