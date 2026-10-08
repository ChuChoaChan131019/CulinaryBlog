import nodemailer from 'nodemailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}));

describe('MailService', () => {
  it('gửi welcome email với nội dung HTML và cấu hình SMTP', async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    jest.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
    const config = {
      get: jest.fn((key: string, fallback?: unknown) =>
        ({
          MAIL_HOST: 'mailhog',
          MAIL_PORT: 1025,
          MAIL_SECURE: 'false',
          MAIL_FROM: 'no-reply@example.test',
        })[key] ?? fallback,
      ),
    };

    const service = new MailService(config as never);
    await service.sendWelcomeEmail({
      to: 'user@example.test',
      displayName: '<Trang>',
      appUrl: 'https://example.test',
    });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@example.test',
        to: 'user@example.test',
        subject: 'Chào mừng bạn đến với Culinary Blog',
        html: expect.stringContaining('&lt;Trang&gt;'),
      }),
    );
  });
});
