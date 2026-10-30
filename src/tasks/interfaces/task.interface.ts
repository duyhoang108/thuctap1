import { UserRole } from "../../users/entities/user.entity";
import { TaskStatus } from "../entities/task.entity";

export interface TaskRequester {
  id: number;
  role: UserRole;
}

export interface PublicTaskUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface PublicTask {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  progress: number;
  assignee: PublicTaskUser;
  createdBy: PublicTaskUser;
}
