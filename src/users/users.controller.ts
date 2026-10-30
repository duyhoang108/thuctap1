import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedRequest } from "../auth/interfaces/authenticated-request.interface";
import { PaginationDto } from "./dto/pagination.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("profile")
  profile(@Req() request: AuthenticatedRequest) {
    return {
      message: "Bạn đã xác thực thành công.",
      user: request.user,
    };
  }

  @Get("auth/users")
  findAll(
    @Query() paginationDto: PaginationDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.findAll(paginationDto, request.user.sub);
  }

  @Get("auth/users/:id")
  findById(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.findById(id, request.user.sub);
  }

  @Patch("auth/users/:id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.update(id, updateUserDto, request.user.sub);
  }

  @Delete("auth/users/:id")
  remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.usersService.remove(id, request.user.sub);
  }
}
