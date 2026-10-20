import { Skeleton } from "@/components/Skeleton";

export default function CategoriesLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-busy="true">
      <span className="sr-only">Đang tải danh mục…</span>
      <Skeleton className="h-4 w-28 rounded-lg" />
      <Skeleton className="mt-4 h-12 max-w-xl rounded-xl" />
      <Skeleton className="mt-4 h-5 max-w-2xl rounded-lg" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="rounded-2xl border border-border bg-card p-6">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="mt-5 h-6 w-3/5 rounded-lg" />
            <Skeleton className="mt-3 h-4 w-full rounded-lg" />
            <Skeleton className="mt-2 h-4 w-4/5 rounded-lg" />
            <Skeleton className="mt-5 h-4 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    </main>
  );
}
