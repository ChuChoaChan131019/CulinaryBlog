'use client';

import { CheckCircle2, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CategoryDto } from '@culinary/shared';
import ImageUploader, { type UploadedImage } from '@/components/ImageUploader';
import IngredientsField, { type IngredientFieldValue } from '@/components/IngredientsField';
import StepsField, { type StepFieldValue } from '@/components/StepsField';
import { apiAuthed } from '@/lib/auth';
import { ApiError } from '@/lib/api';

interface CreatedRecipe { id: string; }

export function NewRecipeForm() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [ingredients, setIngredients] = useState<IngredientFieldValue[]>([]);
  const [steps, setSteps] = useState<StepFieldValue[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void apiAuthed<CategoryDto[]>('/categories').then(setCategories).catch((requestError) => {
      setCategoryError(requestError instanceof Error ? requestError.message : 'Không thể tải danh mục.');
    });
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const recipe = await apiAuthed<CreatedRecipe>('/recipes', {
        method: 'POST',
        body: JSON.stringify({
          title: data.get('title'), description: data.get('description'), categoryId: data.get('categoryId'),
          difficulty: data.get('difficulty'), prepTime: Number(data.get('prepTime')), cookTime: Number(data.get('cookTime')),
          servings: Number(data.get('servings')), instructions: data.get('instructions'),
          ingredients: ingredients.filter((item) => item.name.trim()),
          steps: steps.filter((item) => item.title.trim() && item.description.trim()),
        }),
      });
      setRecipeId(recipe.id);
      setNotice('Đã lưu bản nháp. Bạn có thể tải ảnh và đặt ảnh chính ngay bây giờ.');
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : requestError instanceof Error ? requestError.message : 'Không thể lưu bản nháp.');
    } finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Studio</p><h1 className="mt-2 font-display text-3xl sm:text-4xl">Tạo công thức</h1><p className="mt-2 text-sm text-muted-foreground">Lưu bản nháp trước, sau đó tải ảnh cho công thức.</p></header>
    {notice && <div className="mt-6 flex gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent" role="status"><CheckCircle2 className="h-4 w-4" />{notice}</div>}
    {error && <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</div>}
    {!recipeId ? <form className="mt-8 space-y-8" onSubmit={submit}>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8"><h2 className="font-display text-xl">Thông tin cơ bản</h2><div className="mt-6 grid gap-5"><label><span className="mb-1.5 block text-sm font-medium">Tên công thức</span><input name="title" className="field" required minLength={5} maxLength={200} placeholder="Gà nướng sa tế" /></label><label><span className="mb-1.5 block text-sm font-medium">Mô tả</span><textarea name="description" className="field resize-y" required rows={3} maxLength={2000} /></label><div className="grid gap-5 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-medium">Danh mục</span><select name="categoryId" className="field" required defaultValue="" disabled={Boolean(categoryError)}><option value="" disabled>{categoryError ?? 'Chọn danh mục'}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label><span className="mb-1.5 block text-sm font-medium">Độ khó</span><select name="difficulty" className="field" defaultValue="Easy"><option value="Easy">Dễ</option><option value="Medium">Trung bình</option><option value="Hard">Khó</option></select></label></div><div className="grid gap-5 sm:grid-cols-3"><label><span className="mb-1.5 block text-sm font-medium">Chuẩn bị (phút)</span><input name="prepTime" className="field" type="number" min={1} required /></label><label><span className="mb-1.5 block text-sm font-medium">Nấu (phút)</span><input name="cookTime" className="field" type="number" min={1} required /></label><label><span className="mb-1.5 block text-sm font-medium">Khẩu phần</span><input name="servings" className="field" type="number" min={1} required /></label></div><label><span className="mb-1.5 block text-sm font-medium">Hướng dẫn tổng quát</span><textarea name="instructions" className="field resize-y" required rows={3} /></label></div></section>
      <IngredientsField value={ingredients} onChange={setIngredients} disabled={saving} />
      <StepsField value={steps} onChange={setSteps} disabled={saving} />
      <div className="flex justify-end"><button type="submit" disabled={saving || Boolean(categoryError)} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Đang lưu…' : 'Lưu bản nháp'}</button></div>
    </form> : <div className="mt-8 space-y-6"><ImageUploader recipeId={recipeId} value={images} onChange={setImages} /><p className="text-sm text-muted-foreground">Ảnh đầu tiên được chọn làm ảnh chính; bạn có thể đổi hoặc xóa ảnh bất kỳ lúc nào.</p></div>}
  </div>;
}
