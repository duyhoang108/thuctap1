export interface JwtPayload {
  sub: number;
  email: string;
  name: string;
  tokenType?: "access" | "refresh";
  iat?: number;
  exp?: number;
}
