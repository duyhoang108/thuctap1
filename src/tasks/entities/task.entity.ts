import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
}

@Entity("tasks")
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "varchar", default: TaskStatus.TODO })
  status: TaskStatus;

  @Column({ type: "integer", default: 0 })
  progress: number;

  @ManyToOne(() => User, (user) => user.assignedTasks, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "assignee_id" })
  assignee: User;

  @ManyToOne(() => User, (user) => user.createdTasks, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "created_by_id" })
  createdBy: User;
}
