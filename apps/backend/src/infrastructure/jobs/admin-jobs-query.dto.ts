import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { JobQueueState } from '@culinary/shared';

const JOB_QUEUE_STATES: JobQueueState[] = ['waiting', 'active', 'delayed', 'completed', 'failed'];

export class AdminJobsQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsIn(JOB_QUEUE_STATES)
  state: JobQueueState = 'failed';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
