import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { User, UserRole } from "../users/entities/user.entity";
import { CreateTaskDto } from "./dto/create-task.dto";
import { ListTasksDto } from "./dto/list-tasks.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { Task, TaskStatus } from "./entities/task.entity";
import {
  PublicTask,
  PublicTaskUser,
  TaskRequester,
} from "./interfaces/task.interface";
import { TasksRepository } from "./tasks.repository";

interface CreateTaskCommand {
  dto: CreateTaskDto;
  requester: TaskRequester;
}

interface ListTasksCommand {
  query: ListTasksDto;
  requester: TaskRequester;
}

interface TaskCommand {
  id: number;
  requester: TaskRequester;
}

interface UpdateTaskCommand extends TaskCommand {
  dto: UpdateTaskDto;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async create({ dto, requester }: CreateTaskCommand) {
    this.assertManager(requester);

    const assignee = await this.usersRepository.findOne({
      where: { id: dto.assigneeId },
    });
    if (!assignee) {
      throw new NotFoundException("Không tìm thấy người được giao task.");
    }

    return this.dataSource.transaction(async (manager) => {
      const task = manager.create(Task, {
        title: dto.title,
        description: dto.description ?? null,
        progress: dto.progress ?? 0,
        status: dto.progress === 100 ? TaskStatus.DONE : TaskStatus.TODO,
        assignee,
        createdBy: { id: requester.id } as User,
      });
      const savedTask = await manager.save(Task, task);
      const result = await manager.findOne(Task, {
        where: { id: savedTask.id },
        relations: { assignee: true, createdBy: true },
      });
      if (!result) {
        throw new NotFoundException("Không thể đọc task vừa tạo.");
      }
      return this.toPublicTask(result);
    });
  }

  async findAll({ query, requester }: ListTasksCommand) {
    const tasks = await this.tasksRepository.findVisible(
      requester,
      query.assigneeId,
    );
    return tasks.map((task) => this.toPublicTask(task));
  }

  async findOne({ id, requester }: TaskCommand) {
    const task = await this.getTaskEntity(id);
    this.assertCanView(task, requester);
    return this.toPublicTask(task);
  }

  async update({ id, dto, requester }: UpdateTaskCommand) {
    const task = await this.getTaskEntity(id);
    this.assertCanManage(task, requester);

    Object.assign(task, dto);
    if (dto.progress === 100) task.status = TaskStatus.DONE;
    if (dto.status === TaskStatus.DONE) task.progress = 100;
    if (task.status === TaskStatus.TODO && task.progress > 0) {
      task.status = TaskStatus.IN_PROGRESS;
    }

    return this.toPublicTask(await this.tasksRepository.save(task));
  }

  async remove({ id, requester }: TaskCommand) {
    const task = await this.getTaskEntity(id);
    this.assertCanManage(task, requester);
    await this.tasksRepository.remove(task);
    return { message: "Xóa task thành công." };
  }

  private assertManager(requester: TaskRequester) {
    if (requester.role !== UserRole.MANAGER) {
      throw new ForbiddenException("Chỉ MANAGER được giao task.");
    }
  }

  private assertCanView(task: Task, requester: TaskRequester) {
    if (
      task.assignee.id !== requester.id &&
      task.createdBy.id !== requester.id
    ) {
      throw new ForbiddenException("Bạn không có quyền xem task này.");
    }
  }

  private assertCanManage(task: Task, requester: TaskRequester) {
    this.assertCanView(task, requester);
    if (
      (requester.role === UserRole.MANAGER &&
        task.createdBy.id !== requester.id) ||
      (requester.role === UserRole.EMPLOYEE &&
        task.assignee.id !== requester.id)
    ) {
      throw new ForbiddenException(
        requester.role === UserRole.MANAGER
          ? "Chỉ người tạo task được quản lý task này."
          : "Bạn chỉ được cập nhật task được giao.",
      );
    }
  }

  private async getTaskEntity(id: number) {
    const task = await this.tasksRepository.findById(id);
    if (!task) {
      throw new NotFoundException("Không tìm thấy task.");
    }
    return task;
  }

  private toPublicTask(task: Task): PublicTask {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      progress: task.progress,
      assignee: this.toPublicUser(task.assignee),
      createdBy: this.toPublicUser(task.createdBy),
    };
  }

  private toPublicUser(user: User): PublicTaskUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
