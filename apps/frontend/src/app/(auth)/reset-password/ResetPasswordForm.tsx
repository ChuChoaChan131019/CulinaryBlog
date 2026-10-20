'use client';

import { CheckCircle2, ChefHat, Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { resetPassword } from '@/lib/auth';
import { resetPasswordErrorMessage, validateResetPassword } from './helpers';

export function ResetPasswordForm({ initialToken }: { initialToken: string }) {
  const router = useRouter();
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Thiếu mã đặt lại mật khẩu.');
      return;
    }

    const validationError = validateResetPassword(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await resetPassword(token.trim(), password);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login?message=reset_success');
      }, 2000);
    } catch (err) {
      setError(resetPasswordErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14 sm:py-20">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <ChefHat className="h-6 w-6" />
      </span>
      <h1 className="mt-6 text-center font-display text-3xl">Đặt lại mật khẩu</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Nhập mật khẩu mới cho tài khoản của bạn.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        {success ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm text-accent">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>Đặt lại mật khẩu thành công! Đang chuyển đến trang đăng nhập…</span>
            </div>
            <Link
              href="/login"
              className="block w-full rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <p className="text-sm text-destructive">{error}</p>}

            {!initialToken && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Mã token</span>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="field py-3 px-4"
                  placeholder="Dán mã token từ email"
                />
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Mật khẩu mới</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field py-3 pl-10"
                  placeholder="••••••••"
                />
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Xác nhận mật khẩu mới</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="field py-3 pl-10"
                  placeholder="••••••••"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? 'Đang cập nhật…' : 'Cập nhật mật khẩu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
