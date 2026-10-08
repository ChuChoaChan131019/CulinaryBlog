import {
  getWelcomeEmailRetryDelay,
  WELCOME_EMAIL_RETRY_DELAYS,
} from './welcome-email.queue';

describe('welcome email retry policy', () => {
  it('dùng backoff 1, 5 và 30 phút', () => {
    expect(getWelcomeEmailRetryDelay(0)).toBe(WELCOME_EMAIL_RETRY_DELAYS[0]);
    expect(getWelcomeEmailRetryDelay(1)).toBe(WELCOME_EMAIL_RETRY_DELAYS[1]);
    expect(getWelcomeEmailRetryDelay(2)).toBe(WELCOME_EMAIL_RETRY_DELAYS[2]);
  });

  it('giữ delay cuối cho attempts vượt quá số lần retry', () => {
    expect(getWelcomeEmailRetryDelay(99)).toBe(1_800_000);
  });
});
