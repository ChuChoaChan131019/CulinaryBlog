import { Skeleton } from "@/components/Skeleton";

export default function SearchLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-busy="true">
      <span className="sr-only">Đang tải kết quả tìm kiếm…</span>
      <Skeleton className="h-12 max-w-2xl rounded-xl" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Skeleton className="h-[30rem] rounded-2xl" />
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
