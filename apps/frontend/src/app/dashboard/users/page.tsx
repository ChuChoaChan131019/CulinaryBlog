import type { Metadata } from 'next';
import { RequireRole } from '@/components/RequireRole';
import { UsersDashboard } from './users-dashboard';

export const metadata: Metadata = { title: 'Quản lý người dùng' };

export default function UsersPage() {
  return <RequireRole allow={['Admin']}><UsersDashboard /></RequireRole>;
}
