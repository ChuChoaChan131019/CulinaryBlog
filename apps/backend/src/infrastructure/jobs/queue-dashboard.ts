import { ConflictException, NotFoundException } from '@nestjs/common';
import { Job, JobType, Queue } from 'bullmq';
import { JobQueueItem, JobQueueState, JobQueueSummary } from '@culinary/shared';

export interface JobQueueDashboard {
  readonly queueName: string;
  getSummary(): Promise<JobQueueSummary>;
  getJobs(state: JobQueueState, start: number, end: number): Promise<JobQueueItem[]>;
  retryFailedJob(jobId: string): Promise<void>;
}

const JOB_TYPES: JobType[] = ['waiting', 'active', 'delayed', 'completed', 'failed'];

function safeJob(job: Job, queueName: string, state: JobQueueState): JobQueueItem {
  return {
    id: job.id ?? '',
    queueName,
    name: job.name,
    state,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.opts.attempts ?? 1,
    createdAt: new Date(job.timestamp).toISOString(),
    processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
    finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    failedReason: job.failedReason ? job.failedReason.slice(0, 300) : null,
  };
}

export function createQueueDashboard<T>(queueName: string, queue: Queue<T>): JobQueueDashboard {
  return {
    queueName,
    async getSummary() {
      const counts = await queue.getJobCounts(...JOB_TYPES);
      return {
        queueName,
        counts: {
          waiting: counts.waiting ?? 0,
          active: counts.active ?? 0,
          delayed: counts.delayed ?? 0,
          completed: counts.completed ?? 0,
          failed: counts.failed ?? 0,
        },
      };
    },
    async getJobs(state, start, end) {
      const jobs = await queue.getJobs(state, start, end, false);
      return Promise.all(jobs.map(async (job) => safeJob(job, queueName, (await job.getState()) as JobQueueState)));
    },
    async retryFailedJob(jobId) {
      const job = await queue.getJob(jobId);
      if (!job) throw new NotFoundException('Không tìm thấy job.');
      if ((await job.getState()) !== 'failed') {
        throw new ConflictException('Chỉ có thể chạy lại job đang thất bại.');
      }
      await job.retry('failed');
    },
  };
}
