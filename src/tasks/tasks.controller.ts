import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
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
  create(@Body() dto: CreateTaskDto, @Req() request: AuthenticatedRequest) {
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

  @Get(":id/evidences/:evidenceId")
  async getEvidence(
    @Param("id", ParseIntPipe) id: number,
    @Param("evidenceId", ParseIntPipe) evidenceId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    const evidence = await this.tasksService.getEvidence({
      id,
      evidenceId,
      requester: this.getRequester(request),
    });
    const fallbackFileName =
      evidence.originalName
        .replace(/[^\x20-\x7e]/g, "_")
        .replace(/["\\\r\n]/g, "_") || "evidence";
    const encodedFileName = encodeURIComponent(evidence.originalName).replace(
      /['()*]/g,
      (character) =>
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return new StreamableFile(evidence.content, {
      type: evidence.mimeType,
      length: evidence.size,
      disposition: `attachment; filename="${fallbackFileName}"; filename*=UTF-8''${encodedFileName}`,
    });
  }

  @Patch(":id")
  @UseInterceptors(
    FileInterceptor("evidence", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const allowedMimeTypes = new Set([
          "application/msword",
          "application/pdf",
          "application/vnd.ms-excel",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/zip",
        ]);
        if (
          file.mimetype.startsWith("image/") ||
          file.mimetype.startsWith("text/") ||
          allowedMimeTypes.has(file.mimetype)
        ) {
          callback(null, true);
          return;
        }
        callback(
          new BadRequestException(
            "Chỉ chấp nhận file ảnh, PDF, tài liệu Office, file text hoặc ZIP.",
          ),
          false,
        );
      },
    }),
  )
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @UploadedFile() evidence: Express.Multer.File | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.tasksService.update({
      id,
      dto,
      evidence,
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
