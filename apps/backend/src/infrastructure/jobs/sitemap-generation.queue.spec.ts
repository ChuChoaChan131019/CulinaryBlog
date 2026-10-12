import {
  SITEMAP_GENERATION_JOB,
  SITEMAP_JOB_OPTIONS,
  SITEMAP_SCHEDULE,
  SITEMAP_SCHEDULER_ID,
} from './sitemap-generation.queue';

describe('sitemap generation schedule', () => {
  it('chạy lúc 02:00 UTC và retry tối đa hai lần', () => {
    expect(SITEMAP_SCHEDULER_ID).toBe('daily-sitemap-generation');
    expect(SITEMAP_GENERATION_JOB).toBe('generate-sitemap');
    expect(SITEMAP_SCHEDULE).toEqual({ pattern: '0 2 * * *', tz: 'UTC' });
    expect(SITEMAP_JOB_OPTIONS.attempts).toBe(3);
    expect(SITEMAP_JOB_OPTIONS.removeOnFail).toBe(false);
  });
});
