export default function SearchLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6" aria-busy="true">
      <span className="sr-only">Đang tải kết quả tìm kiếm…</span>
      <div className="h-12 max-w-2xl animate-pulse rounded-xl bg-secondary" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="h-[30rem] animate-pulse rounded-2xl bg-secondary" />
        <div className="grid animate-pulse gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="aspect-[4/3] bg-secondary" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-24 rounded bg-secondary" />
                <div className="h-6 w-4/5 rounded bg-secondary" />
                <div className="h-4 w-full rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
