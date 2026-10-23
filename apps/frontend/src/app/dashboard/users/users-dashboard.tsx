'use client';

import type { UserListItemDto, UserListSort, UserRole } from '@culinary/shared';
import { CheckCircle2, Lock, Search, ShieldAlert, ShieldCheck, Unlock, Users } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pagination } from '@/components/Pagination';
import { apiAuthed, apiAuthedPaged, useSession } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

const PAGE_SIZE = 20;
const sorts: { value: UserListSort; label: string }[] = [
  { value: '-createdAt', label: 'Mới nhất' },
  { value: 'createdAt', label: 'Cũ nhất' },
  { value: 'displayName', label: 'Tên A–Z' },
  { value: 'email', label: 'Email A–Z' },
];


function href(page: number, q?: string, role?: string, sort?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set('q', q);
  if (role) params.set('role', role);
  if (sort && sort !== '-createdAt') params.set('sort', sort);
  return `/dashboard/users?${params}`;
}

export function UsersDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const currentUserId = session?.user?.id;

  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const q = searchParams.get('q') ?? '';
  const role =
    searchParams.get('role') === 'Admin' || searchParams.get('role') === 'Author'
      ? searchParams.get('role')!
      : '';
  const sort = (
    sorts.some(({ value }) => value === searchParams.get('sort'))
      ? searchParams.get('sort')
      : '-createdAt'
  ) as UserListSort;

  const [query, setQuery] = useState(q);
  const [state, setState] = useState<{
    users: UserListItemDto[];
    meta: {
      totalCount: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sort,
    });
    if (q) params.set('q', q);
    if (role) params.set('role', role);

    try {
      const result = await apiAuthedPaged<UserListItemDto>(`/users?${params}`);
      if (id === request.current) {
        setState({ users: result.data, meta: result.meta });
        setError(null);
      }
    } catch (cause) {
      if (id === request.current) {
        setError(
          cause instanceof ApiError && cause.status === 403
            ? 'Bạn không có quyền quản lý người dùng.'
            : 'Không thể tải danh sách người dùng.',
        );
      }
    }
  }, [page, q, role, sort]);

  useEffect(() => {
    void Promise.resolve().then(load);
    return () => {
      request.current += 1;
    };
  }, [load]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    router.push(href(1, query.trim(), role, sort));
  };

  const handleToggleActive = async (user: UserListItemDto) => {
    const newActive = !user.isActive;
    const actionText = newActive ? 'mở khóa' : 'khóa';
    if (!window.confirm(`Bạn có chắc muốn ${actionText} tài khoản của “${user.displayName}”?`)) {
      return;
    }

    setBusyId(user.id);
    setError(null);
    setNotice(null);
    try {
      await apiAuthed<UserListItemDto>(`/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newActive }),
      });
      setNotice(`Đã ${actionText} tài khoản “${user.displayName}”.`);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : `Không thể ${actionText} tài khoản. Vui lòng thử lại.`,
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleRoleChange = async (user: UserListItemDto, newRole: UserRole) => {
    const actionText = newRole === 'Admin' ? 'thăng quyền Admin cho' : 'hạ quyền xuống Author cho';
    if (!window.confirm(`Bạn có chắc muốn ${actionText} “${user.displayName}”?`)) {
      return;
    }

    setBusyId(user.id);
    setError(null);
    setNotice(null);
    try {
      await apiAuthed<UserListItemDto>(`/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setNotice(`Đã chuyển vai trò của “${user.displayName}” sang ${newRole}.`);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Không thể thay đổi vai trò người dùng. Vui lòng thử lại.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const meta = state?.meta;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Admin</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl">Quản lý người dùng</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tìm kiếm, phân quyền vai trò và quản lý trạng thái tài khoản.
        </p>
      </header>

      {notice && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:grid-cols-[1fr_auto_auto]"
      >
        <label className="relative block">
          <span className="sr-only">Tìm người dùng</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="field w-full pl-9"
            placeholder="Tìm theo email hoặc tên hiển thị"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          className="field cursor-pointer"
          value={role}
          onChange={(event) => router.push(href(1, q, event.target.value, sort))}
        >
          <option value="">Tất cả vai trò</option>
          <option value="Admin">Admin</option>
          <option value="Author">Author</option>
        </select>
        <select
          className="field cursor-pointer"
          value={sort}
          onChange={(event) => router.push(href(1, q, role, event.target.value))}
        >
          {sorts.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </form>

      {!state ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
          Đang tải người dùng…
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted-foreground">{meta?.totalCount ?? 0} người dùng</p>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-4 font-medium">Người dùng</th>
                  <th className="px-5 py-4 font-medium">Vai trò</th>
                  <th className="px-5 py-4 font-medium">Trạng thái</th>
                  <th className="px-5 py-4 font-medium">Tham gia</th>
                  <th className="px-5 py-4 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {state.users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const isBusy = busyId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-border/70 last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{user.displayName}</p>
                          {isSelf && (
                            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">
                              Bạn
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.roles.includes('Admin')
                              ? 'bg-primary-soft text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {user.roles.includes('Admin') ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <Users className="h-3 w-3" />
                          )}
                          {user.roles.join(', ')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.isActive
                              ? 'bg-accent-soft text-accent'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.isActive ? 'bg-accent' : 'bg-destructive'
                            }`}
                          />
                          {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(
                          new Date(user.createdAt),
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {isSelf ? (
                          <span className="text-xs italic text-muted-foreground">
                            Tài khoản hiện tại
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            {/* Nút đổi vai trò */}
                            {user.roles.includes('Admin') ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleRoleChange(user, 'Author')}
                                title="Hạ vai trò xuống Author"
                                className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Hạ Author
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleRoleChange(user, 'Admin')}
                                title="Thăng vai trò lên Admin"
                                className="rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Thăng Admin
                              </button>
                            )}

                            {/* Nút khóa / mở khóa */}
                            {user.isActive ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleActive(user)}
                                title="Khóa tài khoản người dùng"
                                className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Lock className="h-3 w-3" />
                                Khóa
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleToggleActive(user)}
                                title="Mở khóa tài khoản người dùng"
                                className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Unlock className="h-3 w-3" />
                                Mở khóa
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {state.users.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="mx-auto mb-3 h-8 w-8" />
                Không tìm thấy người dùng.
              </div>
            )}
          </div>
          {meta && (
            <Pagination
              meta={meta}
              hrefForPage={(next) => href(next, q, role, sort)}
              label="Phân trang người dùng"
            />
          )}
        </>
      )}
    </main>
  );
}
