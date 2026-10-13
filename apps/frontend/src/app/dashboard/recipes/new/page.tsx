import type { Metadata } from 'next';
import { RequireRole } from '@/components/RequireRole';
import RecipeForm from '@/components/RecipeForm';

export const metadata: Metadata = {
  title: 'Tạo công thức mới',
  description: 'Tạo bản nháp công thức và quản lý ảnh MinIO.',
  robots: { index: false, follow: false },
};

export default function NewRecipePage() {
  return <RequireRole allow={['Author', 'Admin']}><RecipeForm mode="create" /></RequireRole>;
}
