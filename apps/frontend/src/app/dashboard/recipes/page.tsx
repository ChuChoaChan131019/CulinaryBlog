import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RequireRole } from '@/components/RequireRole';
import { RecipeDashboard } from './RecipeDashboard';
import { DashboardLoading } from '../loading';

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
