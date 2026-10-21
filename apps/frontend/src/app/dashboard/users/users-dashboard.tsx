'use client';

import type { UserListItemDto, UserListSort } from '@culinary/shared';
import { Search, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorState } from '@/components/ErrorState';
import { Pagination } from '@/components/Pagination';
import { apiAuthedPaged } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

const PAGE_SIZE = 20;
const sorts: { value: UserListSort; label: string }[] = [
  { value: '-createdAt', label: 'Mới nhất' }, { value: 'createdAt', label: 'Cũ nhất' },
  { value: 'displayName', label: 'Tên A–Z' }, { value: 'email', label: 'Email A–Z' },
];

function currentPage(value: string | null) { return Math.max(1, Number.parseInt(value ?? '1', 10) || 1); }
function href(page: number, q?: string, role?: string, sort?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set('q', q); if (role) params.set('role', role); if (sort && sort !== '-createdAt') params.set('sort', sort);
  return `/dashboard/users?${params}`;
}

export function UsersDashboard() {
  const router = useRouter(); const searchParams = useSearchParams();
  const page = currentPage(searchParams.get('page')); const q = searchParams.get('q') ?? '';
  const role = searchParams.get('role') === 'Admin' || searchParams.get('role') === 'Author' ? searchParams.get('role')! : '';
  const sort = (sorts.some(({ value }) => value === searchParams.get('sort')) ? searchParams.get('sort') : '-createdAt') as UserListSort;
  const [query, setQuery] = useState(q); const [state, setState] = useState<{ users: UserListItemDto[]; meta: { totalCount: number; page: number; pageSize: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } } | null>(null);
  const [error, setError] = useState<string | null>(null); const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current; const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort }); if (q) params.set('q', q); if (role) params.set('role', role);
    try { const result = await apiAuthedPaged<UserListItemDto>(`/users?${params}`); if (id === request.current) { setState({ users: result.data, meta: result.meta }); setError(null); } }
    catch (cause) { if (id === request.current) setError(cause instanceof ApiError && cause.status === 403 ? 'Bạn không có quyền quản lý người dùng.' : 'Không thể tải danh sách người dùng.'); }
  }, [page, q, role, sort]);
  useEffect(() => {
    void Promise.resolve().then(load);
    return () => { request.current += 1; };
  }, [load]);
  function submit(event: React.FormEvent) { event.preventDefault(); router.push(href(1, query.trim(), role, sort)); }
  const meta = state?.meta;
  return <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Admin</p><h1 className="mt-2 font-display text-3xl sm:text-4xl">Quản lý người dùng</h1><p className="mt-2 text-sm text-muted-foreground">Tìm kiếm, theo dõi vai trò và trạng thái tài khoản.</p></header>
    <form onSubmit={submit} className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-[1fr_auto_auto]">
      <label className="relative"><span className="sr-only">Tìm người dùng</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input className="field w-full pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Email hoặc tên hiển thị" /></label>
      <select className="field" value={role} onChange={(event) => router.push(href(1, q, event.target.value, sort))}><option value="">Tất cả vai trò</option><option value="Admin">Admin</option><option value="Author">Author</option></select>
      <select className="field" value={sort} onChange={(event) => router.push(href(1, q, role, event.target.value))}>{sorts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
    </form>
    {error ? <ErrorState className="mt-8" title="Không thể tải người dùng" message={error} onRetry={() => void load()} /> : !state ? <div className="mt-8 rounded-2xl border border-border p-12 text-center text-muted-foreground">Đang tải người dùng…</div> : <>
      <p className="mt-6 text-sm text-muted-foreground">{meta?.totalCount ?? 0} người dùng</p>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card shadow-card"><table className="w-full min-w-[720px] text-sm"><thead className="border-b border-border text-left text-muted-foreground"><tr><th className="px-5 py-4 font-medium">Người dùng</th><th className="px-5 py-4 font-medium">Vai trò</th><th className="px-5 py-4 font-medium">Trạng thái</th><th className="px-5 py-4 font-medium">Tham gia</th></tr></thead><tbody>{state.users.map((user) => <tr key={user.id} className="border-b border-border/70 last:border-0"><td className="px-5 py-4"><p className="font-medium">{user.displayName}</p><p className="text-muted-foreground">{user.email}</p></td><td className="px-5 py-4"><span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">{user.roles.join(', ')}</span></td><td className="px-5 py-4"><span className={user.isActive ? 'text-accent' : 'text-destructive'}>{user.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}</span></td><td className="px-5 py-4 text-muted-foreground">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(user.createdAt))}</td></tr>)}</tbody></table>{state.users.length === 0 && <div className="p-12 text-center text-muted-foreground"><Users className="mx-auto mb-3 h-8 w-8" />Không tìm thấy người dùng.</div>}</div>
      {meta && <Pagination meta={meta} hrefForPage={(next) => href(next, q, role, sort)} label="Phân trang người dùng" />}
    </>}
  </main>;
}
