import { existsSync } from 'fs';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from './infrastructure/cache/cache.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { LoggingModule } from './infrastructure/logging/logging.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { HealthModule } from './modules/health/health.module';
import { MediaModule } from './modules/media/media.module';
import { RecipesModule } from './modules/recipes/recipes.module';

// `pnpm dev:be` (pnpm --filter) đặt cwd = apps/backend nên ConfigModule.forRoot mặc định (tìm .env
// ở cwd) không thấy .env ở repo root — dò theo __dirname cho cả 2 trường hợp dev (ts, src/) và build
// production (dist/apps/backend/src/). Không thấy file nào cũng không sao: Docker/CI đã set sẵn env
// qua process.env, ConfigService vẫn đọc được.
const rootEnvFile = [
  join(__dirname, '../../../.env'),
  join(__dirname, '../../../../../../.env'),
].find((path) => existsSync(path));

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: rootEnvFile }),
    LoggingModule,
    DatabaseModule,
    CacheModule,
    AuthModule,
    CategoriesModule,
    RecipesModule,
    MediaModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
