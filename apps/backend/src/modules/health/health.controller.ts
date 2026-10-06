import { Controller, Get, Inject, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { sql } from 'drizzle-orm';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { DATABASE_CONNECTION, Database } from '../../infrastructure/database/database.module';
import { FileStorageService } from '../media/file-storage.service';

type EntryStatus = 'Healthy' | 'Unhealthy';
type Entries = Record<string, { status: EntryStatus }>;

function overallStatus(entries: Entries): EntryStatus {
  return Object.values(entries).every((entry) => entry.status === 'Healthy') ? 'Healthy' : 'Unhealthy';
}

function send(res: Response, entries: Entries): void {
  const status = overallStatus(entries);
  res.status(status === 'Healthy' ? 200 : 503).json({ status, entries });
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly cache: CacheService,
    private readonly fileStorage: FileStorageService,
  ) {}

  private async checkDatabase(): Promise<EntryStatus> {
    try {
      await this.db.execute(sql`select 1`);
      return 'Healthy';
    } catch {
      return 'Unhealthy';
    }
  }

  private async checkRedis(): Promise<EntryStatus> {
    return (await this.cache.isHealthy()) ? 'Healthy' : 'Unhealthy';
  }

  private async checkMinio(): Promise<EntryStatus> {
    return (await this.fileStorage.isHealthy()) ? 'Healthy' : 'Unhealthy';
  }

  @Get()
  async health(@Res() res: Response): Promise<void> {
    const [database, redis, minio] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMinio(),
    ]);
    send(res, { database: { status: database }, redis: { status: redis }, minio: { status: minio } });
  }

  @Get('live')
  live(@Res() res: Response): void {
    send(res, {});
  }

  @Get('ready')
  async ready(@Res() res: Response): Promise<void> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    send(res, { database: { status: database }, redis: { status: redis } });
  }
}
