import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      connectTimeout: 1_000,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    // Redis errors are handled by each operation so cache outages do not fail requests.
    this.redis.on('error', () => undefined);
  }

  async get<T>(key: string, ttlSeconds: number): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (value === null) return null;

      const parsed = JSON.parse(value) as T;
      await this.redis.expire(key, ttlSeconds);
      return parsed;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Cache is an optimization; the source of truth remains PostgreSQL.
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      // Cache is an optimization; the source of truth remains PostgreSQL.
    }
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
