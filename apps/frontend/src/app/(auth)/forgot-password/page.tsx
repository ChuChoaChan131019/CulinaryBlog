import type { Metadata } from 'next';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Quên mật khẩu',
  description: 'Yêu cầu liên kết đặt lại mật khẩu cho tài khoản Culinary Blog của bạn.',
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
