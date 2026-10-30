import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { RedisService } from "../cache/redis.service";
import { PaginationDto } from "./dto/pagination.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserProfile } from "./entities/user-profile.entity";
import { User } from "./entities/user.entity";

export type PublicUser = {
  id: number;
  name: string;
  email: string;
  profile: {
    id: number;
    phone: string | null;
    dateOfBirth: string | null;
    gender: string | null;
  } | null;
};

type UserListResponse = {
  data: PublicUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profilesRepository: Repository<UserProfile>,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async findAll({ page, limit }: PaginationDto, requesterId: number) {
    const version =
      (await this.redisService.get<string>(this.userCacheVersionKey)) ?? "1";
    const cacheKey = `users:list:${requesterId}:${version}:${page}:${limit}`;
    const cached = await this.redisService.get<UserListResponse>(cacheKey);

    if (cached) return cached;

    const [users, total] = await this.usersRepository.findAndCount({
      where: { id: requesterId },
      take: 1,
    });
    const totalPages = Math.ceil(total / limit);
    const result: UserListResponse = {
      data: users.map((user) => this.toPublicUser(user)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };

    await this.redisService.set(
      cacheKey,
      result,
      this.configService.getOrThrow<number>("REDIS_CACHE_TTL"),
    );
    return result;
  }

  async findById(id: number, requesterId: number) {
    this.assertOwner(id, requesterId);
    const cacheKey = `users:detail:${id}`;
    const cached = await this.redisService.get<PublicUser>(cacheKey);
    if (cached) return cached;

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException("Không tìm thấy người dùng.");

    const result = this.toPublicUser(user);
    await this.redisService.set(
      cacheKey,
      result,
      this.configService.getOrThrow<number>("REDIS_CACHE_TTL"),
    );
    return result;
  }

  async update(id: number, updateUserDto: UpdateUserDto, requesterId: number) {
    this.assertOwner(id, requesterId);
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException("Không tìm thấy người dùng.");

    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name.trim();
    }
    if (updateUserDto.password !== undefined) {
      user.password = await bcrypt.hash(updateUserDto.password, 12);
    }
    if (updateUserDto.profile !== undefined) {
      const profile = user.profile ?? this.profilesRepository.create({ user });
      Object.assign(profile, updateUserDto.profile);
      await this.profilesRepository.save(profile);
      user.profile = profile;
    }

    const savedUser = await this.usersRepository.save(user);
    await this.invalidateUserCaches(id);
    return {
      message: "Cập nhật thông tin người dùng thành công.",
      user: this.toPublicUser(savedUser),
    };
  }

  async remove(id: number, requesterId: number) {
    this.assertOwner(id, requesterId);
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException("Không tìm thấy người dùng.");

    if (user.profile) await this.profilesRepository.remove(user.profile);
    await this.usersRepository.remove(user);
    await this.invalidateUserCaches(id);
    return {
      message: "Xóa người dùng thành công.",
      user: this.toPublicUser(user),
    };
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      profile: user.profile
        ? {
            id: user.profile.id,
            phone: user.profile.phone,
            dateOfBirth: user.profile.dateOfBirth,
            gender: user.profile.gender,
          }
        : null,
    };
  }

  private readonly userCacheVersionKey = "users:cache-version";

  async invalidateCaches() {
    await this.invalidateUserCaches();
  }

  private async invalidateUserCaches(id?: number) {
    await this.redisService.increment(this.userCacheVersionKey);
    if (id !== undefined) {
      await this.redisService.delete(`users:detail:${id}`);
    }
  }

  private assertOwner(id: number, requesterId: number) {
    if (id !== requesterId) {
      throw new ForbiddenException(
        "Bạn chỉ được thao tác trên tài khoản của mình.",
      );
    }
  }
}
