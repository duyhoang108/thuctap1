import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { User } from "../auth/entities/user.entity";
import { Task } from "./entities/task.entity";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  imports: [TypeOrmModule.forFeature([Task, User]), AuthModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
