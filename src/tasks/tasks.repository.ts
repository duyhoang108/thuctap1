import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { Task } from "./entities/task.entity";
import { TaskRequester } from "./interfaces/task.interface";
import { UserRole } from "../users/entities/user.entity";

@Injectable()
export class TasksRepository {
  constructor(
    @InjectRepository(Task)
    private readonly repository: Repository<Task>,
  ) {}

  findById(id: number) {
    return this.repository.findOne({
      where: { id },
      relations: { assignee: true, createdBy: true },
    });
  }

  findVisible(requester: TaskRequester, assigneeId?: number) {
    const query = this.repository
      .createQueryBuilder("task")
      .leftJoinAndSelect("task.assignee", "assignee")
      .leftJoinAndSelect("task.createdBy", "createdBy")
      .orderBy("task.id", "DESC");

    if (requester.role === UserRole.EMPLOYEE) {
      query.where("assignee.id = :requesterId", { requesterId: requester.id });
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

    return query.getMany();
  }

  save(task: Task) {
    return this.repository.save(task);
  }

  create(data: Partial<Task>) {
    return this.repository.create(data);
  }

  remove(task: Task) {
    return this.repository.remove(task);
  }
}
