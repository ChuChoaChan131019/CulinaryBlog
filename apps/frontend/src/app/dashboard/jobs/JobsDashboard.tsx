'use client';

import type { JobQueueItem, JobQueueState, JobQueueSummary, PagedResponse } from '@culinary/shared';
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { apiAuthed, apiAuthedPaged } from '@/lib/auth';

const PAGE_SIZE = 20;
const states: { value: JobQueueState; label: string }[] = [
  { value: 'failed', label: 'Thất bại' },
  { value: 'waiting', label: 'Đang chờ' },
  { value: 'active', label: 'Đang chạy' },
  { value: 'delayed', label: 'Đã lên lịch' },
  { value: 'completed', label: 'Hoàn tất' },
];

const stateLabels: Record<JobQueueState, string> = {
  waiting: 'Đang chờ', active: 'Đang chạy', delayed: 'Đã lên lịch', completed: 'Hoàn tất', failed: 'Thất bại',
};

const stateTones: Record<JobQueueState, string> = {
  waiting: 'bg-secondary text-secondary-foreground',
  active: 'bg-primary-soft text-primary',
  delayed: 'bg-accent-soft text-accent',
  completed: 'bg-accent-soft text-accent',
  failed: 'bg-destructive/10 text-destructive',
};

interface JobsPageData {
  items: JobQueueItem[];
  meta: PagedResponse<JobQueueItem>['meta'];
}

export function JobsDashboard() {
  const [queues, setQueues] = useState<JobQueueSummary[]>([]);
  const [queueName, setQueueName] = useState('');
  const [state, setState] = useState<JobQueueState>('failed');
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<JobsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadQueues = useCallback(async () => {
    try {
      const result = await apiAuthed<JobQueueSummary[]>('/admin/jobs');
      setQueues(result);
      setQueueName((current) => current || result[0]?.queueName || '');
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 403
        ? 'Bạn không có quyền quản lý tác vụ nền.'
        : 'Không thể tải trạng thái các hàng đợi. Vui lòng thử lại.');
    }
  }, []);

  const loadJobs = useCallback(async () => {
    if (!queueName) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ state, page: String(page), pageSize: String(PAGE_SIZE) });
      const result = await apiAuthedPaged<JobQueueItem>(`/admin/jobs/${encodeURIComponent(queueName)}?${params}`);
      setJobs({ items: result.data, meta: result.meta });
      setError(null);
    } catch (cause) {
      setJobs(null);
      setError(cause instanceof ApiError
        ? cause.message
        : 'Không thể tải danh sách tác vụ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, queueName, state]);

  useEffect(() => { void Promise.resolve().then(loadQueues); }, [loadQueues]);
  useEffect(() => { void Promise.resolve().then(loadJobs); }, [loadJobs]);

  const refresh = async () => {
    await loadQueues();
    await loadJobs();
  };

  const retry = async (job: JobQueueItem) => {
    if (!window.confirm(`Chạy lại tác vụ “${job.name}” (${job.id})?`)) return;
    setBusyJobId(`${job.queueName}:${job.id}`);
    setError(null);
    setNotice(null);
    try {
      await apiAuthed<void>(`/admin/jobs/${encodeURIComponent(job.queueName)}/${encodeURIComponent(job.id)}/retries`, { method: 'POST' });
      setNotice(`Đã đưa “${job.name}” trở lại hàng đợi.`);
      await Promise.all([loadQueues(), loadJobs()]);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Không thể chạy lại tác vụ. Vui lòng thử lại.');
    } finally {
      setBusyJobId(null);
    }
  };

  const total = (key: JobQueueState) => queues.reduce((sum, queue) => sum + queue.counts[key], 0);
  const selectedTotal = (key: JobQueueState) => queueName === 'all'
    ? total(key)
    : queues.find((queue) => queue.queueName === queueName)?.counts[key] ?? 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Admin</p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">Quản lý tác vụ nền</h1>
          <p className="mt-2 text-sm text-muted-foreground">Theo dõi hàng đợi, xem lỗi và chạy lại tác vụ thất bại.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Làm mới
        </button>
      </header>

      {notice && <div role="status" className="mt-6 flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent"><CheckCircle2 className="h-4 w-4" />{notice}</div>}
      {error && <div role="alert" className="mt-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><ShieldAlert className="h-4 w-4 shrink-0" />{error}</div>}

      <section aria-label="Tổng số tác vụ" className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Summary icon={<Activity className="h-5 w-5" />} label="Đang chờ" value={total('waiting')} />
        <Summary icon={<Clock3 className="h-5 w-5" />} label="Đang chạy" value={total('active')} />
        <Summary icon={<Clock3 className="h-5 w-5" />} label="Đã lên lịch" value={total('delayed')} />
        <Summary icon={<CheckCircle2 className="h-5 w-5" />} label="Hoàn tất" value={total('completed')} />
        <Summary icon={<XCircle className="h-5 w-5" />} label="Thất bại" value={total('failed')} danger />
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl">Danh sách tác vụ</h2>
            <p className="mt-1 text-sm text-muted-foreground">Payload tác vụ được ẩn; chỉ hiển thị thông tin vận hành.</p>
          </div>
          <label className="grid gap-1.5 text-sm font-medium" htmlFor="jobs-queue">Hàng đợi
            <select id="jobs-queue" className="field min-w-56" value={queueName} onChange={(event) => { setQueueName(event.target.value); setPage(1); }}>
              <option value="all">Tất cả hàng đợi</option>
              {queues.map(({ queueName: name }) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Lọc theo trạng thái">
          {states.map(({ value, label }) => <button key={value} type="button" onClick={() => { setState(value); setPage(1); }} aria-pressed={state === value} className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${state === value ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:text-foreground'}`}>{label} ({selectedTotal(value)})</button>)}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-3 font-semibold">Tác vụ</th><th className="px-3 py-3 font-semibold">Hàng đợi</th><th className="px-3 py-3 font-semibold">Trạng thái</th><th className="px-3 py-3 font-semibold">Lần thử</th><th className="px-3 py-3 font-semibold">Tạo lúc</th><th className="px-3 py-3 font-semibold">Kết thúc</th><th className="px-3 py-3" /></tr></thead>
            <tbody className="divide-y divide-border">
              {jobs?.items.map((job) => <tr key={`${job.queueName}:${job.id}`} className="align-top">
                <td className="px-3 py-4"><p className="font-medium">{job.name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{job.id}</p>{job.failedReason && <p className="mt-2 flex max-w-sm items-start gap-1.5 text-xs text-destructive"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{job.failedReason}</p>}</td>
                <td className="px-3 py-4 text-muted-foreground">{job.queueName}</td>
                <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stateTones[job.state]}`}>{stateLabels[job.state]}</span></td>
                <td className="px-3 py-4 tabular-nums">{job.attemptsMade}/{job.maxAttempts}</td>
                <td className="px-3 py-4 text-muted-foreground">{formatDate(job.createdAt)}</td>
                <td className="px-3 py-4 text-muted-foreground">{job.finishedAt ? formatDate(job.finishedAt) : '—'}</td>
                <td className="px-3 py-4">{job.state === 'failed' && <button type="button" onClick={() => void retry(job)} disabled={busyJobId === `${job.queueName}:${job.id}`} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-secondary disabled:opacity-50"><RotateCcw className={`h-3.5 w-3.5 ${busyJobId === `${job.queueName}:${job.id}` ? 'animate-spin' : ''}`} />Chạy lại</button>}</td>
              </tr>)}
            </tbody>
          </table>
          {!loading && jobs?.items.length === 0 && <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center"><p className="font-display text-lg">Không có tác vụ</p><p className="mt-1 text-sm text-muted-foreground">Không tìm thấy tác vụ ở trạng thái này.</p></div>}
          {loading && <div className="px-4 py-12 text-center text-sm text-muted-foreground">Đang tải tác vụ…</div>}
        </div>

        {jobs && jobs.meta.totalPages > 1 && <div className="mt-5 flex items-center justify-between border-t border-border pt-4"><p className="text-sm text-muted-foreground">Trang {jobs.meta.page}/{jobs.meta.totalPages} · {jobs.meta.totalCount} tác vụ</p><div className="flex gap-2"><button type="button" disabled={!jobs.meta.hasPreviousPage || loading} onClick={() => setPage((value) => value - 1)} className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40">Trước</button><button type="button" disabled={!jobs.meta.hasNextPage || loading} onClick={() => setPage((value) => value + 1)} className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40">Sau</button></div></div>}
      </section>
    </main>
  );
}

function Summary({ icon, label, value, danger = false }: { icon: React.ReactNode; label: string; value: number; danger?: boolean }) {
  return <article className={`rounded-2xl border bg-card p-5 shadow-card ${danger ? 'border-destructive/30' : 'border-border'}`}><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${danger ? 'bg-destructive/10 text-destructive' : 'bg-primary-soft text-primary'}`}>{icon}</div><p className="mt-4 text-sm text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl tabular-nums">{value}</p></article>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
