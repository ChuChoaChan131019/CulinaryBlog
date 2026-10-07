import type { Metadata } from 'next';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = {
  title: 'Đăng ký',
  description: 'Tạo tài khoản Culinary Blog để viết, đăng và quản lý công thức của riêng bạn.',
  robots: { index: false },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
