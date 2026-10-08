'use client';

import { AlertTriangle, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CategoryDto, CreateCategoryRequest, CreatedCategoryDto } from '@culinary/shared';
import { apiAuthed } from '@/lib/auth';
import { CategoryRow, type CategoryUpdate } from './CategoryRow';
import { categoryErrorMessage, validateCategoryName } from './helpers';

export function CategoriesAdmin() {
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    setError(null);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const fetchCategories = useCallback(async (): Promise<boolean> => {
    try {
      const result = await apiAuthed<CategoryDto[]>('/categories');
      setCategories(result);
      setLoadError(null);
      return true;
    } catch (requestError) {
      const message = categoryErrorMessage(requestError);
      setLoadError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reloadCategories = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setLoadError(null);
    return fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    // Bắt đầu request bên ngoài khi Admin component mount; state chỉ cập nhật khi request trả về.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCategories();
  }, [fetchCategories]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const trimmedName = name.trim();
    const nameError = validateCategoryName(trimmedName);
    if (nameError) {
      setError(nameError);
      return;
    }

    setIsCreating(true);
    try {
      const payload: CreateCategoryRequest = {
        name: trimmedName,
        ...(description.trim() ? { description: description.trim() } : {}),
      };
      await apiAuthed<CreatedCategoryDto>('/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setName('');
      setDescription('');
      if (await reloadCategories()) {
        showNotice(`Đã thêm “${trimmedName}”.`);
      } else {
        setError(`Đã thêm “${trimmedName}”, nhưng không thể tải lại danh sách.`);
      }
    } catch (requestError) {
      setError(categoryErrorMessage(requestError));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(category: CategoryDto, update: CategoryUpdate) {
    setError(null);
    setNotice(null);
    setBusyCategoryId(category.id);
    try {
      // Endpoint này thuộc FR-CAT-004 / Issue #29; slug được backend giữ nguyên khi đổi tên.
      await apiAuthed<CategoryDto>(`/categories/${encodeURIComponent(category.id)}`, {
        method: 'PUT',
        body: JSON.stringify(update),
      });
      if (await reloadCategories()) {
        showNotice(`Đã cập nhật “${update.name}”.`);
      } else {
        setError(`Đã cập nhật “${update.name}”, nhưng không thể tải lại danh sách.`);
      }
    } catch (requestError) {
      setError(categoryErrorMessage(requestError));
    } finally {
      setBusyCategoryId(null);
    }
  }

  async function handleDelete(category: CategoryDto) {
    if (!window.confirm(`Xoá danh mục “${category.name}”?`)) return;

    setError(null);
    setNotice(null);
    setBusyCategoryId(category.id);
    try {
      await apiAuthed<void>(`/categories/${encodeURIComponent(category.id)}`, {
        method: 'DELETE',
      });
      if (await reloadCategories()) {
        showNotice(`Đã xoá “${category.name}”.`);
      } else {
        setError(`Đã xoá “${category.name}”, nhưng không thể tải lại danh sách.`);
      }
    } catch (requestError) {
      setError(categoryErrorMessage(requestError));
    } finally {
      setBusyCategoryId(null);
    }
  }

  const isEmpty = categories?.length === 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Admin</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">Quản lý danh mục</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tạo, đổi tên và xoá các danh mục dùng để phân loại công thức.
        </p>
      </header>

      {notice && (
        <div
          className="mt-6 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {notice}
        </div>
      )}
      {error && (
        <div
          className="mt-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {error}
        </div>
      )}

      <form
        className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8"
        onSubmit={handleCreate}
      >
        <h2 className="font-display text-xl">Danh mục mới</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Tên</span>
            <input
              className="field"
              value={name}
              maxLength={50}
              minLength={2}
              required
              disabled={isCreating}
              placeholder="Món Việt"
              onChange={(event) => setName(event.target.value)}
            />
            <span className="mt-1.5 block text-xs text-muted-foreground">
              Slug sẽ được tạo tự động và giữ nguyên sau khi đổi tên.
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium">Mô tả ngắn</span>
            <textarea
              className="field resize-y"
              value={description}
              rows={3}
              disabled={isCreating}
              placeholder="Những món ăn quen thuộc trong bữa cơm gia đình."
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={isCreating}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {isCreating ? 'Đang thêm…' : 'Thêm danh mục'}
        </button>
      </form>

      <section className="mt-8 space-y-4" aria-labelledby="category-list-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="category-list-heading" className="font-display text-xl">
            Danh mục hiện có
          </h2>
          {isLoading && categories !== null && (
            <span className="text-xs text-muted-foreground" role="status">
              Đang đồng bộ…
            </span>
          )}
        </div>

        {loadError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            <p>{loadError}</p>
            <button
              type="button"
              className="mt-3 rounded-full border border-destructive/40 px-4 py-2 text-xs font-semibold hover:bg-destructive/10"
              onClick={() => void reloadCategories()}
            >
              Thử lại
            </button>
          </div>
        )}

        {isLoading && categories === null && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Đang tải danh mục…
          </div>
        )}

        {!isLoading && !loadError && isEmpty && (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Chưa có danh mục nào. Hãy tạo danh mục đầu tiên ở biểu mẫu bên trên.
          </p>
        )}

        {categories && categories.length > 0 && (
          <div className="space-y-4">
            {categories.map((category) => (
              <CategoryRow
                key={`${category.id}:${category.name}:${category.description ?? ''}`}
                category={category}
                busy={busyCategoryId === category.id}
                onSave={(update) => handleUpdate(category, update)}
                onDelete={() => handleDelete(category)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
