import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class ListTasksDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "assigneeId phải là số nguyên" })
  @Min(1)
  @Max(2147483647)
  assigneeId?: number;
}
