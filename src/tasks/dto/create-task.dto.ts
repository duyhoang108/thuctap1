import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: "Tiêu đề task không được để trống" })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt({ message: "assigneeId phải là số nguyên" })
  @Min(1)
  assigneeId: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}
