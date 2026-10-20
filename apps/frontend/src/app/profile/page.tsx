'use client';

import { CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { UserProfileDto } from '@culinary/shared';
import { ApiError } from '@/lib/api';
import { changePassword, updateProfile, useSession } from '@/lib/auth';
import { RequireRole } from '@/components/RequireRole';
import {
  changePasswordErrorMessage,
  validateChangePassword,
} from './change-password.helpers';

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(-2)
      .join('')
      .toUpperCase() || '?'
  );
}

export default function ProfilePage() {
  const session = useSession();
  return (
    <RequireRole allow={['Author', 'Admin']}>
      {/* `key` buộc remount khi đổi tài khoản (đăng xuất rồi đăng nhập user khác) để state
          form không giữ dữ liệu của người dùng trước. */}
      {session && <ProfileForm key={session.user.id} initial={session.user} />}
    </RequireRole>
  );
}

function ProfileForm({ initial }: { initial: UserProfileDto }) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? '');
  const [bio, setBio] = useState(initial.bio ?? '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Tài khoản</p>
      <h1 className="mt-2 font-display text-3xl sm:text-4xl">Hồ sơ của bạn</h1>

      <div className="mt-8 flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card p-6 shadow-card">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`Ảnh đại diện của ${displayName}`}
            className="h-20 w-20 rounded-full object-cover"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-full bg-primary-soft font-display text-xl font-semibold">
            {initialsOf(displayName)}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-display text-xl">{displayName || 'Chưa đặt tên'}</p>
          <p className="text-sm text-muted-foreground">{initial.email}</p>
          <p className="mt-2 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
            {initial.role}
          </p>
        </div>
      </div>

      {saved && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
          <CheckCircle2 className="h-4 w-4" />
          Đã cập nhật hồ sơ.
        </div>
      )}
      {error && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form
        className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError(null);
          try {
            await updateProfile({
              displayName: displayName.trim() || 'Chưa đặt tên',
              avatarUrl: avatarUrl.trim(),
              bio,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2600);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Không thể cập nhật hồ sơ, thử lại sau.');
          } finally {
            setSaving(false);
          }
        }}
      >
        <h2 className="font-display text-xl">Chỉnh sửa thông tin</h2>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Tên hiển thị</span>
          <input className="field" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Ảnh đại diện (URL)</span>
          <input
            className="field"
            value={avatarUrl}
            placeholder="https://example.com/photo.jpg"
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Giới thiệu ngắn</span>
          <textarea rows={3} className="field resize-y" value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </form>

      <ChangePasswordForm />
    </div>
  );
}

function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateChangePassword(
      currentPassword,
      newPassword,
      confirmPassword,
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      router.push('/login?message=changed_password');
    } catch (err) {
      setError(changePasswordErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8"
      onSubmit={handleSubmit}
    >
      <h2 className="font-display text-xl">Đổi mật khẩu</h2>
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Mật khẩu hiện tại</span>
        <input
          type="password"
          required
          className="field"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Mật khẩu mới</span>
        <input
          type="password"
          required
          minLength={8}
          className="field"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
        </span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Xác nhận mật khẩu mới</span>
        <input
          type="password"
          required
          className="field"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {saving ? 'Đang đổi mật khẩu…' : 'Cập nhật mật khẩu'}
      </button>
    </form>
  );
}
