'use client';

import { CheckCircle2, ChefHat, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { requestPasswordReset } from '@/lib/auth';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      setError('Không thể gửi yêu cầu đặt lại mật khẩu, vui lòng thử lại sau.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14 sm:py-20">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <ChefHat className="h-6 w-6" />
      </span>
      <h1 className="mt-6 text-center font-display text-3xl">Quên mật khẩu</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        {sent ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 text-sm text-accent">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Yêu cầu đã được ghi nhận</p>
                <p className="mt-1 text-muted-foreground">
                  Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến hộp thư của bạn. Vui lòng kiểm tra email (bao gồm cả thư mục Spam).
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="mt-6 block w-full rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field py-3 pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}
            </button>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Nhớ mật khẩu rồi?{' '}
              <Link href="/login" className="font-semibold text-primary">
                Đăng nhập
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
