import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CACHE_PORT } from '../../application/ports/cache.port';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CacheService, { provide: CACHE_PORT, useExisting: CacheService }],
  exports: [CacheService, CACHE_PORT],
})
export class CacheModule {}
