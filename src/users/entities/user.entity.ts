import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Task } from "../../tasks/entities/task.entity";
import { UserProfile } from "./user-profile.entity";

export enum UserRole {
  MANAGER = "MANAGER",
  EMPLOYEE = "EMPLOYEE",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: "varchar",
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @OneToOne(() => UserProfile, (profile) => profile.user, {
    cascade: ["insert", "update"],
    eager: true,
  })
  profile: UserProfile | null;

  @OneToMany(() => Task, (task) => task.assignee)
  assignedTasks: Task[];

  @OneToMany(() => Task, (task) => task.createdBy)
  createdTasks: Task[];
}
