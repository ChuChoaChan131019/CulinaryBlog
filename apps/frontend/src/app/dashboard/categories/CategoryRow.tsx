'use client';

import { Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { CategoryDto } from '@culinary/shared';
import { CategoryIcon } from '@/components/CategoryIcon';
import { validateCategoryName } from './helpers';

export type CategoryUpdate = {
  name: string;
  description: string | null;
};

interface CategoryRowProps {
  category: CategoryDto;
  busy: boolean;
  onSave: (update: CategoryUpdate) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function CategoryRow({ category, busy, onSave, onDelete }: CategoryRowProps) {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? '');

  const nameError = name.trim() ? validateCategoryName(name) : 'Tên danh mục không được để trống.';
  const originalDescription = category.description ?? '';
  const dirty = name !== category.name || description !== originalDescription;
  const canSave = dirty && !nameError && !busy;

  return (
    <article
      className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-card sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
      aria-busy={busy}
    >
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-soft text-primary">
        <CategoryIcon name={category.name} className="h-6 w-6" />
      </span>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="sr-only">Tên của {category.name}</span>
          <input
            className="field"
            value={name}
            maxLength={50}
            disabled={busy}
            aria-invalid={Boolean(nameError)}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="sr-only">Mô tả của {category.name}</span>
          <input
            className="field"
            value={description}
            disabled={busy}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        {nameError && (
          <p className="text-xs text-destructive sm:col-span-2" role="alert">
            {nameError}
          </p>
        )}
        <p className="text-xs text-muted-foreground sm:col-span-2">
          /{category.slug} · {category.recipeCount} công thức đã xuất bản
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => {
            if (!canSave) return;
            void onSave({ name: name.trim(), description: description.trim() || null });
          }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save className="h-4 w-4" aria-hidden />
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDelete()}
          aria-label={`Xoá ${category.name}`}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          <span className="sr-only">Xoá</span>
        </button>
      </div>
    </article>
  );
}
