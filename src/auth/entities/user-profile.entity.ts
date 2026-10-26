import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("user_profiles")
export class UserProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => User, (user) => user.profile, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "varchar", nullable: true })
  phone: string | null;

  @Column({ type: "date", nullable: true })
  date_of_birth: string | null;

  @Column({ type: "varchar", nullable: true })
  gender: string | null;
}
