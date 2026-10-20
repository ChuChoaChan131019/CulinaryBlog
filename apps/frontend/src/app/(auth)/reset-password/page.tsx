import type { Metadata } from 'next';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Đặt lại mật khẩu',
  description: 'Thiết lập mật khẩu mới cho tài khoản Culinary Blog của bạn.',
  robots: { index: false },
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;
  const initialToken =
    typeof token === 'string'
      ? token
      : Array.isArray(token)
        ? token[0] ?? ''
        : '';
  return <ResetPasswordForm initialToken={initialToken} />;
}
