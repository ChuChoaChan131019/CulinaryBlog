'use client';

import { ChefHat, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GoogleButton } from '@/components/GoogleButton';
import { login, loginWithGoogle, useSession } from '@/lib/auth';
import { loginErrorMessage } from './helpers';

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const session = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Đã đăng nhập (vd bấm back) mà vào lại /login -> đẩy thẳng đi, không hiện lại form.
  useEffect(() => {
    if (session) router.replace(redirectTo);
  }, [session, redirectTo, router]);

  if (session) return null;

  const handleGoogleCredential = async (idToken: string) => {
    setError(null);
    try {
      await loginWithGoogle(idToken);
      router.push(redirectTo);
    } catch (err) {
      setError(loginErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14 sm:py-20">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
        <ChefHat className="h-6 w-6" />
      </span>
      <h1 className="mt-6 text-center font-display text-3xl">Chào mừng trở lại</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Đăng nhập vào gian bếp Culinary Blog của bạn.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            setError(null);
            try {
              await login(email, password);
              router.push(redirectTo);
            } catch (err) {
              setError(loginErrorMessage(err));
            } finally {
              setSubmitting(false);
            }
          }}
        >
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
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Mật khẩu</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field py-3 pl-10"
                placeholder="••••••••"
              />
            </div>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          hoặc
          <span className="h-px flex-1 bg-border" />
        </div>
        <GoogleButton label="Đăng nhập với Google" onCredential={handleGoogleCredential} onError={setError} />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="font-semibold text-primary">
            Tạo tài khoản
          </Link>
        </p>
      </div>
    </div>
  );
}
