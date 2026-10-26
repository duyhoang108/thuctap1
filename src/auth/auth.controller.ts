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
} from "@nestjs/common";
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
    return this.authService.refresh(refreshTokenDto.refresh_token);
  }

  @Get("users")
  findAllUsers(@Query() paginationDto: PaginationDto) {
    return this.authService.findAllUsers(paginationDto);
  }

  @Get("users/:id")
  findUserById(@Param("id", ParseIntPipe) id: number) {
    return this.authService.findUserById(id);
  }

  @Patch("users/:id")
  updateUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.authService.updateUser(id, updateUserDto);
  }

  @Delete("users/:id")
  deleteUser(@Param("id", ParseIntPipe) id: number) {
    return this.authService.deleteUser(id);
  }
}
