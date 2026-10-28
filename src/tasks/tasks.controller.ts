import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksService } from "./tasks.service";

@Controller("tasks")
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tasksService.create(body, {
      id: request.user.sub,
      role: request.user.role,
    });
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    const rawAssigneeId = request.query.assigneeId;
    const assigneeId =
      typeof rawAssigneeId === "string" ? Number(rawAssigneeId) : undefined;

    return this.tasksService.findAll({
      id: request.user.sub,
      role: request.user.role,
    }, assigneeId === undefined ? undefined : Number(assigneeId));
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.tasksService.findOne(id, {
      id: request.user.sub,
      role: request.user.role,
    });
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tasksService.update(id, dto, {
      id: request.user.sub,
      role: request.user.role,
    });
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number, @Req() request: AuthenticatedRequest) {
    return this.tasksService.remove(id, {
      id: request.user.sub,
      role: request.user.role,
    });
  }
}
