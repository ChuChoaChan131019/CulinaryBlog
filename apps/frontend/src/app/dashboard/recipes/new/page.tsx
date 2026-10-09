import type { Metadata } from 'next';
import { RequireRole } from '@/components/RequireRole';
import { NewRecipeForm } from './NewRecipeForm';

export const metadata: Metadata = {
  title: 'Tạo công thức mới',
  description: 'Tạo bản nháp công thức và quản lý ảnh MinIO.',
  robots: { index: false, follow: false },
};

export default function NewRecipePage() {
  return <RequireRole allow={['Author', 'Admin']}><NewRecipeForm /></RequireRole>;
}
