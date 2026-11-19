import { Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';
import { AdminJobsController } from './admin-jobs.controller';
import { JobsModule } from './jobs.module';

@Module({
  imports: [AuthModule, JobsModule],
  controllers: [AdminJobsController],
})
export class AdminJobsModule {}
