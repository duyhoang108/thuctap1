import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthenticatedRequest } from "./interfaces/authenticated-request.interface";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { PaginationDto } from "./dto/pagination.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("health")
  health() {
    return { message: "Auth module is working" };
  }

  @Post("register")
  @Throttle({ default: { limit: 50, ttl: 60_000 } })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post("login")
  @Throttle({ default: { limit: 50, ttl: 60_000 } })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post("refresh")
  @Throttle({ default: { limit: 50, ttl: 60_000 } })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }

  @Get("users")
  @UseGuards(JwtAuthGuard)
  findAllUsers(
    @Query() paginationDto: PaginationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.findAllUsers(paginationDto, request.user.sub);
  }

  @Get("users/:id")
  @UseGuards(JwtAuthGuard)
  findUserById(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.findUserById(id, request.user.sub);
  }

  @Patch("users/:id")
  @UseGuards(JwtAuthGuard)
  updateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.updateUser(id, updateUserDto, request.user.sub);
  }

  @Delete("users/:id")
  @UseGuards(JwtAuthGuard)
  deleteUser(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.deleteUser(id, request.user.sub);
  }
}
