import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { User, UserRole } from "../auth/entities/user.entity";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { Task, TaskStatus } from "./entities/task.entity";

type Requester = { id: number; role: UserRole };
type PublicTask = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  progress: number;
  assignee: { id: number; name: string; email: string; role: UserRole };
  createdBy: { id: number; name: string; email: string; role: UserRole };
};

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(body: Record<string, unknown>, requester: Requester) {
    this.assertManager(requester);
    const assigneeId = body.assigneeId;
    const taskEntries = Object.entries(body).filter(([key]) =>
      /^task\d+$/.test(key),
    );

    if (
      !Number.isInteger(assigneeId) ||
      (assigneeId as number) < 1 ||
      taskEntries.length === 0
    ) {
      throw new BadRequestException(
        "Cần assigneeId hợp lệ và ít nhất một task (task1, task2, ...).",
      );
    }

    if (
      taskEntries.some(
        ([, title]) => typeof title !== "string" || title.trim().length === 0,
      )
    ) {
      throw new BadRequestException("Nội dung task không được để trống.");
    }

    const assignee = await this.usersRepository.findOne({
      where: { id: assigneeId as number },
    });
    if (!assignee) {
      throw new NotFoundException("Không tìm thấy người được giao task.");
    }

    const tasks = this.tasksRepository.create(
      taskEntries.map(([, title]) => ({
        title: (title as string).trim(),
        description: null,
        progress: 0,
        status: TaskStatus.TODO,
        assignee,
        createdBy: { id: requester.id } as User,
      })),
    );
    const savedTasks = await this.tasksRepository.save(tasks);
    return Promise.all(
      savedTasks.map((task) => this.findOne(task.id, requester)),
    );
  }

  findAll(requester: Requester, assigneeId?: number) {
    if (
      assigneeId !== undefined &&
      (!Number.isInteger(assigneeId) || assigneeId < 1)
    ) {
      throw new BadRequestException("assigneeId phải là số nguyên dương.");
    }

    const query = this.tasksRepository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.assignee", "assignee")
      .leftJoinAndSelect("task.createdBy", "createdBy")
      .orderBy("task.id", "DESC");

    if (requester.role === UserRole.EMPLOYEE) {
      query.where("assignee.id = :id", { id: requester.id });
    } else {
      query.where(
        new Brackets((where) => {
          where.where("createdBy.id = :requesterId", {
            requesterId: requester.id,
          });
        }),
      );
      if (assigneeId !== undefined) {
        query.andWhere("assignee.id = :assigneeId", { assigneeId });
      }
    }
    return query.getMany().then((tasks) => tasks.map((task) => this.toPublicTask(task)));
  }

  async findOne(id: number, requester: Requester) {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: { assignee: true, createdBy: true },
    });
    if (!task) {
      throw new NotFoundException("Không tìm thấy task.");
    }
    this.assertCanView(task, requester);
    return this.toPublicTask(task);
  }

  async update(id: number, dto: UpdateTaskDto, requester: Requester) {
    const task = await this.getTaskEntity(id);
    this.assertCanView(task, requester);
    if (requester.role !== UserRole.EMPLOYEE) {
      if (task.createdBy.id !== requester.id) {
        throw new ForbiddenException("Chỉ người tạo task được quản lý task này.");
      }
    } else if (task.assignee.id !== requester.id) {
      throw new ForbiddenException("Bạn chỉ được cập nhật task được giao.");
    }

    Object.assign(task, dto);
    if (dto.progress === 100) task.status = TaskStatus.DONE;
    if (dto.status === TaskStatus.DONE) task.progress = 100;
    if (task.status === TaskStatus.TODO && task.progress > 0) {
      task.status = TaskStatus.IN_PROGRESS;
    }
    const savedTask = await this.tasksRepository.save(task);
    return this.toPublicTask(savedTask);
  }

  async remove(id: number, requester: Requester) {
    const task = await this.getTaskEntity(id);
    this.assertCanView(task, requester);
    this.assertManager(requester);
    if (task.createdBy.id !== requester.id) {
      throw new ForbiddenException("Chỉ người tạo task được xóa task này.");
    }
    await this.tasksRepository.remove(task);
    return { message: "Xóa task thành công." };
  }

  private assertManager(requester: Requester) {
    if (requester.role !== UserRole.MANAGER) {
      throw new ForbiddenException("Chỉ MANAGER được giao task.");
    }
  }

  private assertCanView(task: Task, requester: Requester) {
    if (
      task.assignee.id !== requester.id &&
      task.createdBy.id !== requester.id
    ) {
      throw new ForbiddenException("Bạn không có quyền xem task này.");
    }
  }

  private async getTaskEntity(id: number) {
      const task = await this.tasksRepository.findOne({
        where: { id },
        relations: { assignee: true, createdBy: true },
      });
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

  private toPublicUser(user: User) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
  }
}
