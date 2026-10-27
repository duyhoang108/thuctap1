import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthenticatedRequest } from "./interfaces/authenticated-request.interface";

@Controller()
export class ProfileController {
  @UseGuards(JwtAuthGuard)
  @Get("profile")
  profile(@Req() request: AuthenticatedRequest) {
    return {
      message: "Bạn đã xác thực thành công.",
      user: request.user,
    };
  }
}
