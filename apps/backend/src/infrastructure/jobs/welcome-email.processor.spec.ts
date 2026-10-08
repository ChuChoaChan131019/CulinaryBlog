import { processWelcomeEmail } from './welcome-email.processor';

describe('welcome email processor', () => {
  it('gửi email với payload của job', async () => {
    const mailService = { sendWelcomeEmail: jest.fn().mockResolvedValue(undefined) };
    const job = {
      data: {
        email: 'user@example.test',
        displayName: 'Người dùng A',
        appUrl: 'https://example.test',
      },
    };

    await processWelcomeEmail(mailService, job);

    expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith({
      to: job.data.email,
      displayName: job.data.displayName,
      appUrl: job.data.appUrl,
    });
  });

  it('đẩy lỗi SMTP lên BullMQ để thực hiện retry', async () => {
    const error = new Error('SMTP unavailable');
    const mailService = { sendWelcomeEmail: jest.fn().mockRejectedValue(error) };
    const job = {
      data: {
        email: 'user@example.test',
        displayName: 'Người dùng A',
        appUrl: 'https://example.test',
      },
    };

    await expect(processWelcomeEmail(mailService, job)).rejects.toBe(error);
  });
});
