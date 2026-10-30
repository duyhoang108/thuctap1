import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096, { message: "Refresh token không hợp lệ" })
  refreshToken: string;
}
