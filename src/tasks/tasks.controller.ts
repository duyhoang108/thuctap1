import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface";
import { CreateTaskDto } from "./dto/create-task.dto";
import { ListTasksDto } from "./dto/list-tasks.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksService } from "./tasks.service";

@Controller("tasks")
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Body() dto: CreateTaskDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tasksService.create({
      dto,
      requester: this.getRequester(request),
    });
  }

  @Get()
  findAll(@Query() query: ListTasksDto, @Req() request: AuthenticatedRequest) {
    return this.tasksService.findAll({
      query,
      requester: this.getRequester(request),
    });
  }

  @Get(":id")
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tasksService.findOne({
      id,
      requester: this.getRequester(request),
    });
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tasksService.update({
      id,
      dto,
      requester: this.getRequester(request),
    });
  }

  @Delete(":id")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tasksService.remove({
      id,
      requester: this.getRequester(request),
    });
  }

  private getRequester(request: AuthenticatedRequest) {
    return {
      id: request.user.sub,
      role: request.user.role,
    };
  }
}
