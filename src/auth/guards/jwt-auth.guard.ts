import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { JwtPayload } from "../interfaces/jwt-payload.interface";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../users/entities/user.entity";

interface RequestWithUser extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Yêu cầu phải có Authorization: ******");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (payload.tokenType !== "access") {
        throw new UnauthorizedException("Chỉ access token được phép sử dụng.");
      }
      const user = await this.usersRepository.findOne({
        where: { id: payload.sub },
        select: ["id", "tokenVersion"],
      });
      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException("Token đã bị thu hồi.");
      }
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("Token không hợp lệ hoặc đã hết hạn.");
    }
  }

  private extractToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return undefined;
    }

    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1];
  }
}
