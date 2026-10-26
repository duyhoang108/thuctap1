import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthenticatedRequest } from "./interfaces/authenticated-request.interface";

@Controller()
export class ProfileController {
  /*13. Vì sao dùng Guard thay vì Middleware?
   Middleware cũng có thể đọc header, 
   nhưng Guard phù hợp hơn cho authentication trong NestJS.
   Middleware
  Middleware chạy trước controller và thường dùng cho:
  Logging.
  CORS.
  Gắn request ID.
  Xử lý request chung.*/
  /*Guard
    Guard được thiết kế để quyết định:
    Request này có được vào route không?
    Guard dễ gắn vào từng route: và dễ trả về 401 Unauthorized
    Vì vậy với yêu cầu xác thực route, dùng Guard là lựa chọn phù hợp hơn Middleware.
 */
  @UseGuards(JwtAuthGuard)
  @Get("profile")
  profile(@Req() request: AuthenticatedRequest) {
    /*Thứ tự thực tế:
      GET /profile
        ↓
    JwtAuthGuard.canActivate()
        ↓
    verifyAsync(token)
        ↓
    request.user = payload
        ↓
    profile(request)
    Controller lấy user
    và trả về*/
    return {
      message: "Bạn đã xác thực thành công.",
      user: request.user,
    };
  }
}
  