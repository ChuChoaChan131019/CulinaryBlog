import { Skeleton } from "@/components/Skeleton";

export default function RecipeDetailLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-busy="true">
      <span className="sr-only">Đang tải công thức…</span>
      <Skeleton className="h-5 w-36 rounded-lg" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <Skeleton className="aspect-[4/3] rounded-2xl" />
        <div className="space-y-5">
          <Skeleton className="h-4 w-28 rounded-lg" />
          <Skeleton className="h-12 w-4/5 rounded-xl" />
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-3/4 rounded-lg" />
          <div className="grid grid-cols-3 gap-3 pt-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="mt-12 space-y-4">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-5 w-full rounded-lg" />
        <Skeleton className="h-5 w-11/12 rounded-lg" />
        <Skeleton className="h-5 w-4/5 rounded-lg" />
      </div>
    </main>
  );
}
