import { Skeleton } from "@/components/Skeleton";

export function RecipesLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-busy="true">
      <span className="sr-only">Đang tải danh sách công thức…</span>
      <Skeleton className="h-12 max-w-2xl rounded-xl" />
      <Skeleton className="mt-4 h-5 max-w-xl rounded-lg" />
      <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-11 rounded-xl lg:w-28" />
        <Skeleton className="hidden h-11 rounded-xl lg:block lg:w-28" />
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
            <Skeleton className="aspect-[4/3] rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default RecipesLoading;
