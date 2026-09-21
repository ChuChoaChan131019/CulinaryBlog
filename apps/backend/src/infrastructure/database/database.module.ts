import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { USER_REPOSITORY } from '../../application/auth/user.repository';
import { DATABASE_CONNECTION } from './database.tokens';
import { DrizzleUserRepository } from './repositories/drizzle-user.repository';
import * as schema from './schema';

export { DATABASE_CONNECTION } from './database.tokens';
export type Database = ReturnType<typeof drizzle<typeof schema>>;

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Database => {
        const pool = new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
        });
        return drizzle(pool, { schema });
      },
    },
    DrizzleUserRepository,
    { provide: USER_REPOSITORY, useExisting: DrizzleUserRepository },
  ],
  exports: [DATABASE_CONNECTION, USER_REPOSITORY],
})
export class DatabaseModule {}
