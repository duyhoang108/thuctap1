import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";

export class ListTasksDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "assigneeId phải là số nguyên" })
  @Min(1)
  assigneeId?: number;
}
