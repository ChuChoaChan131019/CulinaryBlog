import type { Metadata } from 'next';
import { safeRedirect } from './helpers';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập Culinary Blog để lưu công thức, viết bài và quản lý gian bếp của bạn.',
  robots: { index: false },
};

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect } = await searchParams;
  return <LoginForm redirectTo={safeRedirect(redirect)} />;
}
