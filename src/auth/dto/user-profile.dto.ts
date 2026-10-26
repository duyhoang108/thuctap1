import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from "class-validator";

export enum Gender {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}

export class UserProfileDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString({ message: "Số điện thoại phải là chuỗi ký tự" })
  @Matches(/^\+?[0-9\s-]{8,20}$/, {
    message: "Số điện thoại không hợp lệ",
  })
  phone?: string;

  @IsOptional()
  @IsDateString({}, {
    message: "Ngày sinh phải có định dạng ngày hợp lệ YYYY-MM-DD",
  })
  date_of_birth?: string;

  @IsOptional()
  @IsEnum(Gender, {
    message: "Giới tính phải là male, female hoặc other",
  })
  gender?: Gender;
}
