import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { TaskStatus } from "../entities/task.entity";

export class UpdateTaskDto {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}
