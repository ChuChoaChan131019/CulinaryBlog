'use client';

import { ChefHat, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GoogleButton } from '@/components/GoogleButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

      <Card className="mt-8 rounded-2xl border border-border py-0 shadow-card">
        <CardContent className="p-6 sm:p-8">
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
            <div>
              <Label htmlFor="email" className="mb-1.5">
                Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-auto py-3 pl-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label htmlFor="password">Mật khẩu</Label>
                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-auto py-3 pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-full px-6 text-sm font-semibold"
            >
              {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>
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
        </CardContent>
      </Card>
    </div>
  );
}
