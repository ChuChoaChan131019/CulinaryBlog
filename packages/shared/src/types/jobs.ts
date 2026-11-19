export const JOB_QUEUE_STATES = ['waiting', 'active', 'delayed', 'completed', 'failed'] as const;

export type JobQueueState = (typeof JOB_QUEUE_STATES)[number];

export interface JobQueueSummary {
  queueName: string;
  counts: Record<JobQueueState, number>;
}

/** Safe metadata only. The BullMQ job payload is deliberately excluded. */
export interface JobQueueItem {
  id: string;
  queueName: string;
  name: string;
  state: JobQueueState;
  attemptsMade: number;
  maxAttempts: number;
  createdAt: string;
  processedAt: string | null;
  finishedAt: string | null;
  failedReason: string | null;
}
