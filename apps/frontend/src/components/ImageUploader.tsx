'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Star, Trash2, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { apiAuthed, apiUpload } from '@/lib/auth';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export interface UploadedImage { id: string; url: string; alt: string | null; isPrimary: boolean; }
interface ImageUploaderProps { recipeId: string; value?: UploadedImage[]; onChange?: (images: UploadedImage[]) => void; maxFiles?: number; disabled?: boolean; }
interface PendingImage { id: string; previewUrl: string; name: string; progress: number; }
interface RecipeImageResponse { imageId: string; originalUrl: string; altText: string | null; isPrimary: boolean; }

function asUploadedImage(image: RecipeImageResponse): UploadedImage {
  return { id: image.imageId, url: image.originalUrl, alt: image.altText, isPrimary: image.isPrimary };
}

export default function ImageUploader({ recipeId, value = [], onChange, maxFiles = 10, disabled = false }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState(value);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setImages(value), [value]);

  const updateImages = (next: UploadedImage[]) => { setImages(next); onChange?.(next); };

  async function uploadFiles(files: File[]) {
    setError(null);
    const available = Math.max(0, maxFiles - images.length - pending.length);
    if (available === 0) { setError(`Bạn chỉ có thể tải tối đa ${maxFiles} ảnh.`); return; }
    let currentImages = images;
    for (const file of files.slice(0, available)) {
      if (!ACCEPTED_TYPES.includes(file.type)) { setError('Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc AVIF.'); continue; }
      if (file.size > MAX_FILE_SIZE) { setError('Kích thước ảnh không được vượt quá 5MB.'); continue; }
      const pendingId = `${file.name}-${file.lastModified}`;
      const previewUrl = URL.createObjectURL(file);
      setPending((current) => [...current, { id: pendingId, previewUrl, name: file.name, progress: 0 }]);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('altText', file.name);
        const uploaded = await apiUpload<RecipeImageResponse>(`/recipes/${encodeURIComponent(recipeId)}/images`, formData, (progress) => {
          setPending((current) => current.map((item) => item.id === pendingId ? { ...item, progress } : item));
        });
        currentImages = [...currentImages, asUploadedImage(uploaded)];
        updateImages(currentImages);
      } catch (uploadError) {
        setError(uploadError instanceof ApiError && uploadError.status === 429 ? 'Bạn đã tải quá nhiều ảnh. Vui lòng thử lại sau một phút.' : uploadError instanceof Error ? uploadError.message : 'Không thể tải ảnh lên.');
      } finally {
        URL.revokeObjectURL(previewUrl);
        setPending((current) => current.filter((item) => item.id !== pendingId));
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  async function setPrimary(id: string) {
    setError(null);
    try {
      const updated = await apiAuthed<RecipeImageResponse>(`/recipes/${encodeURIComponent(recipeId)}/images/${encodeURIComponent(id)}/primary`, { method: 'PATCH' });
      updateImages(images.map((image) => image.id === id ? asUploadedImage(updated) : { ...image, isPrimary: false }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Không thể đặt ảnh chính.');
    }
  }

  async function removeImage(image: UploadedImage) {
    setError(null);
    try {
      await apiAuthed<void>(`/recipes/${encodeURIComponent(recipeId)}/images/${encodeURIComponent(image.id)}`, { method: 'DELETE' });
      const next = images.filter((item) => item.id !== image.id);
      if (image.isPrimary && next[0]) next[0] = { ...next[0], isPrimary: true };
      updateImages(next);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Không thể xóa ảnh.');
    }
  }

  const chooseFiles = (files: File[]) => void uploadFiles(files);
  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-card" aria-label="Quản lý ảnh công thức">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="font-display text-xl">Ảnh công thức</h2><p className="mt-1 text-sm text-muted-foreground">JPEG, PNG, WebP hoặc AVIF · tối đa 5MB mỗi ảnh</p></div>
        <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => inputRef.current?.click()} disabled={disabled || images.length + pending.length >= maxFiles}><ImagePlus className="h-4 w-4" aria-hidden /> Thêm ảnh</button>
        <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} multiple className="sr-only" onChange={(event) => chooseFiles(Array.from(event.target.files ?? []))} disabled={disabled} />
      </div>
      {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><span>{error}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setError(null)}><X className="h-4 w-4" /></button></div>}
      <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!disabled) chooseFiles(Array.from(event.dataTransfer.files)); }} className="grid min-h-36 gap-3 rounded-xl border border-dashed border-border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-3">
        {pending.map((item) => <div key={item.id} className="grid gap-2 rounded-xl border border-border bg-card p-2"><div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted"><img src={item.previewUrl} alt={`Đang tải ${item.name}`} className="h-full w-full object-cover opacity-70" /><LoaderCircle className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary" aria-hidden /></div><div className="h-2 overflow-hidden rounded-full bg-primary/20"><div className="h-full bg-primary transition-all" style={{ width: `${item.progress}%` }} /></div><p className="truncate text-xs text-muted-foreground">{item.progress}% · {item.name}</p></div>)}
        {images.map((image) => <article key={image.id} className="grid gap-2 rounded-xl border border-border bg-card p-2"><div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted"><img src={image.url} alt={image.alt ?? 'Ảnh công thức'} className="h-full w-full object-cover" />{image.isPrimary && <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">Ảnh chính</span>}</div><div className="flex items-center justify-between gap-2"><button type="button" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-surface hover:text-primary disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void setPrimary(image.id)} disabled={image.isPrimary || disabled}><Star className="h-3.5 w-3.5" aria-hidden /> Đặt chính</button><button type="button" aria-label={`Xóa ${image.alt ?? 'ảnh'}`} className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void removeImage(image)} disabled={disabled}><Trash2 className="h-4 w-4" /></button></div></article>)}
        {pending.length === 0 && images.length === 0 && <button type="button" className="grid place-items-center px-6 text-center text-sm text-muted-foreground transition-colors hover:text-primary" onClick={() => inputRef.current?.click()} disabled={disabled}><ImagePlus className="mx-auto mb-2 h-7 w-7" aria-hidden /><span>Thả ảnh vào đây hoặc chọn ảnh để tải lên</span></button>}
      </div>
    </section>
  );
}
