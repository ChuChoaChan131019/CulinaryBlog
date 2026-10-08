import type { Metadata } from 'next';
import { RequireRole } from '@/components/RequireRole';
import { CategoriesAdmin } from './CategoriesAdmin';

export const metadata: Metadata = {
  title: 'Quản lý danh mục',
  description: 'Công cụ quản trị để tạo, chỉnh sửa và xoá danh mục công thức.',
  robots: { index: false, follow: false },
};

export default function CategoriesPage() {
  return (
    <RequireRole allow={['Admin']}>
      <CategoriesAdmin />
    </RequireRole>
  );
}
