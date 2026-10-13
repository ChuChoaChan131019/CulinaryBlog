import type { Metadata } from 'next';
import RecipeForm from '@/components/RecipeForm';
import { RequireRole } from '@/components/RequireRole';

export const metadata: Metadata = {
  title: 'Chỉnh sửa công thức',
  description: 'Chỉnh sửa bản nháp công thức và quản lý ảnh Culinary Blog.',
  robots: { index: false, follow: false },
};

interface EditRecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = await params;
  return <RequireRole allow={['Author', 'Admin']}><RecipeForm mode="edit" recipeId={id} /></RequireRole>;
}
