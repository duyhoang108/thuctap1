import { Transform, Type } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: "Tiêu đề task không được để trống" })
  @MaxLength(100, { message: "Tiêu đề task không được quá 100 ký tự" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: "Mô tả task không được quá 1000 ký tự" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  description?: string;

  @Type(() => Number)
  @IsInt({ message: "assigneeId phải là số nguyên" })
  @Min(1)
  assigneeId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}
