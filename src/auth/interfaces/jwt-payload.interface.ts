import { UserRole } from "../../users/entities/user.entity";

export interface JwtPayload {
  sub: number;
  email: string;
  name: string;
  role: UserRole;
  tokenType?: "access" | "refresh";
  iat?: number;
  exp?: number;
}
