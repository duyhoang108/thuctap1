import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Task } from "../../tasks/entities/task.entity";

@Entity("task_evidences")
export class TaskEvidence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "original_name" })
  originalName: string;

  @Column({ name: "mime_type" })
  mimeType: string;

  @Column({ type: "integer" })
  size: number;

  @Column({ type: "bytea" })
  content: Buffer;

  @Column({ type: "integer" })
  progress: number;

  @CreateDateColumn({ name: "submitted_at", type: "timestamptz" })
  submittedAt: Date;

  @ManyToOne(() => Task, (task) => task.evidences, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "task_id" })
  task: Task;

  @ManyToOne(() => User, (user) => user.submittedEvidences, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "submitted_by_id" })
  submittedBy: User;
}
