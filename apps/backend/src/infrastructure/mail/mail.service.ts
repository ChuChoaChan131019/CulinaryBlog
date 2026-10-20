import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface WelcomeEmailInput {
  to: string;
  displayName: string;
  appUrl: string;
}

export interface PasswordResetEmailInput {
  to: string;
  displayName: string;
  resetUrl: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const host = config.get<string>('MAIL_HOST', 'localhost');
    const port = Number(config.get<string>('MAIL_PORT', '1025'));
    const secure = config.get<string>('MAIL_SECURE', 'false') === 'true';
    const user = config.get<string>('MAIL_USER');
    const password = config.get<string>('MAIL_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && password ? { auth: { user, pass: password } } : {}),
    });
    this.from = config.get<string>('MAIL_FROM', 'no-reply@culinaryblog.local');
  }

  async sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
    const safeDisplayName = escapeHtml(input.displayName);
    const safeAppUrl = escapeHtml(input.appUrl);

    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: 'Chào mừng bạn đến với Culinary Blog',
      text: `Chào mừng ${input.displayName} đến với Culinary Blog: ${input.appUrl}`,
      html: [
        '<!doctype html>',
        '<html lang="vi">',
        '<body>',
        `<h1>Chào mừng ${safeDisplayName}!</h1>`,
        '<p>Tài khoản Culinary Blog của bạn đã được tạo thành công.</p>',
        `<p><a href="${safeAppUrl}">Truy cập Culinary Blog</a></p>`,
        '</body>',
        '</html>',
      ].join(''),
    });

    this.logger.log(`Welcome email sent to ${maskEmail(input.to)}`);
  }

  async sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void> {
    const safeDisplayName = escapeHtml(input.displayName);
    const safeResetUrl = escapeHtml(input.resetUrl);

    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: 'Đặt lại mật khẩu Culinary Blog',
      text: `Chào ${input.displayName}, nhấp vào liên kết sau để đặt lại mật khẩu: ${input.resetUrl}`,
      html: [
        '<!doctype html>',
        '<html lang="vi">',
        '<body>',
        `<h1>Xin chào ${safeDisplayName},</h1>`,
        '<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Culinary Blog của bạn.</p>',
        `<p><a href="${safeResetUrl}">Đặt lại mật khẩu</a></p>`,
        '<p>Liên kết này có hiệu lực trong vòng 30 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>',
        '</body>',
        '</html>',
      ].join(''),
    });

    this.logger.log(`Password reset email sent to ${maskEmail(input.to)}`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const escaped = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' } as Record<
      string,
      string
    >;
    return escaped[character] ?? character;
  });
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain || localPart.length < 2) return '***';
  return `${localPart[0]}***@${domain}`;
}
