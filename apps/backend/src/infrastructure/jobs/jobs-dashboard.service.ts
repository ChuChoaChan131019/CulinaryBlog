import { Injectable, NotFoundException } from '@nestjs/common';
import { PagedResult, JobQueueItem, JobQueueState, JobQueueSummary } from '@culinary/shared';
import { PasswordResetEmailQueue } from './password-reset-email.queue';
import { RecipeImageCleanupQueue } from './recipe-image-cleanup.queue';
import { RecipeImageResizeQueue } from './recipe-image-resize.queue';
import { SitemapGenerationQueue } from './sitemap-generation.queue';
import { WelcomeEmailQueue } from './welcome-email.queue';
import { JobQueueDashboard } from './queue-dashboard';

@Injectable()
export class JobsDashboardService {
  private readonly queues: Map<string, JobQueueDashboard>;

  constructor(
    welcomeEmail: WelcomeEmailQueue,
    passwordResetEmail: PasswordResetEmailQueue,
    recipeImageResize: RecipeImageResizeQueue,
    recipeImageCleanup: RecipeImageCleanupQueue,
    sitemapGeneration: SitemapGenerationQueue,
  ) {
    const dashboards = [
      welcomeEmail.dashboard,
      passwordResetEmail.dashboard,
      recipeImageResize.dashboard,
      recipeImageCleanup.dashboard,
      sitemapGeneration.dashboard,
    ];
    this.queues = new Map<string, JobQueueDashboard>(
      dashboards.map((dashboard) => [dashboard.queueName, dashboard] as const),
    );
  }

  async getSummaries(): Promise<JobQueueSummary[]> {
    return Promise.all([...this.queues.values()].map((queue) => queue.getSummary()));
  }

  async getJobs(
    queueName: string,
    state: JobQueueState,
    page: number,
    pageSize: number,
  ): Promise<PagedResult<JobQueueItem>> {
    const queue = this.getQueue(queueName);
    const summary = await queue.getSummary();
    const totalCount = summary.counts[state];
    const totalPages = Math.ceil(totalCount / pageSize);
    const items = await queue.getJobs(state, (page - 1) * pageSize, page * pageSize - 1);

    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async getAllJobs(
    state: JobQueueState,
    page: number,
    pageSize: number,
  ): Promise<PagedResult<JobQueueItem>> {
    const queues = [...this.queues.values()];
    const summaries = await Promise.all(queues.map((queue) => queue.getSummary()));
    const totalCount = summaries.reduce((sum, summary) => sum + summary.counts[state], 0);
    const batches = await Promise.all(queues.map((queue, index) => {
      const count = summaries[index].counts[state];
      return count ? queue.getJobs(state, 0, count - 1) : Promise.resolve([]);
    }));
    const items = batches.flat().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  retryFailedJob(queueName: string, jobId: string): Promise<void> {
    return this.getQueue(queueName).retryFailedJob(jobId);
  }

  private getQueue(queueName: string): JobQueueDashboard {
    const queue = this.queues.get(queueName);
    if (!queue) throw new NotFoundException('Không tìm thấy hàng đợi.');
    return queue;
  }
}
