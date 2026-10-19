import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireRole } from '@/components/RequireRole';
import { RecipeDashboard } from './RecipeDashboard';

export const metadata: Metadata = {
  title: 'Quản lý công thức',
  description: 'Xem và quản lý các công thức nấu ăn của bạn.',
  robots: { index: false, follow: false },
};

export default function DashboardRecipesPage() {
  return (
    <RequireRole allow={['Author', 'Admin']}>
      <Suspense fallback={<DashboardLoading />}>
        <RecipeDashboard />
      </Suspense>
    </RequireRole>
  );
}

function DashboardLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-busy="true">
      <p className="text-sm text-muted-foreground">Đang tải danh sách công thức…</p>
    </main>
  );
}
