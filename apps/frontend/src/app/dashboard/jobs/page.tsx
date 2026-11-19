import type { Metadata } from 'next';
import { RequireRole } from '@/components/RequireRole';
import { JobsDashboard } from './JobsDashboard';

export const metadata: Metadata = {
  title: 'Quản lý tác vụ nền',
  robots: { index: false, follow: false },
};

export default function JobsPage() {
  return <RequireRole allow={['Admin']}><JobsDashboard /></RequireRole>;
}
