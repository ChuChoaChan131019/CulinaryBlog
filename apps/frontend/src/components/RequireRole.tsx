'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import type { UserRole } from '@culinary/shared';
import { useSession } from '@/lib/auth';

/**
 * Chặn nội dung theo role. Chưa đăng nhập thì đẩy về `/login` kèm `redirect` để quay
 * lại đúng trang sau khi đăng nhập; đã đăng nhập nhưng sai role thì hiện thông báo
 * thay vì điều hướng, tránh vòng lặp chuyển trang.
 *
 * Đây là hàng rào UX, không phải hàng rào bảo mật — quyền thật do backend kiểm ở
 * `RolesGuard`, component này chỉ để người dùng không bấm vào chỗ chắc chắn bị 403.
 */
export function RequireRole({ allow, children }: { allow: UserRole[]; children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const permitted = session !== null && allow.includes(session.user.role);

  useEffect(() => {
    if (session === null) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [session, pathname, router]);

  if (permitted) return <>{children}</>;

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
        <Lock className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="mt-5 font-display text-2xl">
        {session === null ? 'Vui lòng đăng nhập' : 'Bạn không có quyền xem trang này'}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {session === null
          ? 'Đang chuyển tới trang đăng nhập…'
          : `Khu vực này chỉ dành cho ${allow.join(', ')}.`}
      </p>
      <Link
        href="/recipes"
        className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
      >
        Xem công thức
      </Link>
    </div>
  );
}
