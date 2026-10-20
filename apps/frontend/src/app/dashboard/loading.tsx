import { Skeleton } from "@/components/Skeleton";

export function DashboardLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-busy="true">
      <span className="sr-only">Đang tải khu vực quản lý…</span>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-xl space-y-3">
          <Skeleton className="h-4 w-20 rounded-lg" />
          <Skeleton className="h-10 w-72 rounded-xl" />
          <Skeleton className="h-4 w-full rounded-lg" />
        </div>
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
      <div className="mt-8 flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-24 rounded-full" />
        ))}
      </div>
      <Skeleton className="mt-8 h-5 w-40 rounded-lg" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:p-5">
            <Skeleton className="h-28 rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-32 rounded-lg" />
              <Skeleton className="h-7 w-3/5 rounded-lg" />
              <Skeleton className="h-4 w-4/5 rounded-lg" />
              <Skeleton className="h-9 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default DashboardLoading;
