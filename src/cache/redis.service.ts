import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis(
      this.configService.get<string>("REDIS_URL") ?? "redis://localhost:6379",
      {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      },
    );
    this.client.on("error", (error: Error) => {
      this.logger.warn(`Redis unavailable: ${error.message}`);
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log("Redis cache connected");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Redis cache disabled: ${message}`);
    }
  }

  async onModuleDestroy() {
    if (this.client.status !== "end") {
      await this.client.quit();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.logCacheError("read", key, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    try {
      await this.client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      this.logCacheError("write", key, error);
    }
  }

  async delete(key: string) {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logCacheError("delete", key, error);
    }
  }

  async increment(key: string) {
    try {
      await this.client.incr(key);
    } catch (error) {
      this.logCacheError("invalidate", key, error);
    }
  }

  private logCacheError(operation: string, key: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Redis ${operation} failed for ${key}: ${message}`);
  }
}
