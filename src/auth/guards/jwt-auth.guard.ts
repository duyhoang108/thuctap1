//10. Vì sao cần Auth Guard?
/*Tạo JWT mới chỉ là bước cấp thẻ. Auth Guard là bước kiểm tra thẻ.
Guard nằm giữa request và controller:
Client Request
    ↓
JwtAuthGuard
    ├── Token sai → 401
    └── Token đúng → Controller
    Nếu không có guard, route vẫn chạy dù client không đăng nhập.
*/
/*Guard hoạt động từng bước
Bước 1: Client gửi request
GET /profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Bước 2: NestJS chạy Guard trước controller
Route có: @UseGuards(JwtAuthGuard) 
Nên NestJS gọi: canActivate() trước khi gọi method controller*/
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { JwtPayload } from "../interfaces/jwt-payload.interface";
/*Bước 1: Client gửi request
GET /profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...*/
interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    //Bước 3: Lấy request
    //context chứa thông tin của request hiện tại.
    //getRequest() lấy object HTTP request.
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);
    //Bước 6: Không có token dừng request Controller không đc chạy
    // kết quả: 401 Unauthorized
    if (!token) {
      throw new UnauthorizedException(
        "Yêu cầu phải có Authorization: Bearer <token>.",
      );
    }

    try {
      //Bước 7: Kiểm tra token
      /*verifyAsync() kiểm tra:
      Token có đúng cấu trúc không.
      Signature có đúng không.
      Secret có khớp không.
      Token có hết hạn không.
      Nếu tất cả đúng, nó trả payload.
      Nếu sai, nó ném lỗi.
 */
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
      return true; //Cho phép request vào controller.
    } catch {
      throw new UnauthorizedException("Token không hợp lệ hoặc đã hết hạn.");
    }
  }

  private extractToken(request: Request): string | undefined {
    //Bước 4: Đọc Authorization header
    // Ví dụ: Bearer eyJhbGciOiJIUzI1NiIs...
    const authorization = request.headers.authorization;

    if (!authorization) {
      return undefined;
    }
    //Bước 5: Tách token khỏi chữ Bearer: kết quả: eyJhbGciOiJIUzI1NiIs...
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1];
  }
}
