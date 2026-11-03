import { Type } from "class-transformer";
import { IsEnum, IsInt, Max, Min, ValidateIf } from "class-validator";
import { TaskStatus } from "../entities/task.entity";

export class UpdateTaskDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}
