import Link from "next/link";

export default function RecipeNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Công thức</p>
      <h1 className="mt-3 font-display text-3xl">Không tìm thấy công thức</h1>
      <p className="mt-3 text-muted-foreground">
        Công thức có thể đã được đổi tên, xóa hoặc không còn khả dụng.
      </p>
      <Link
        href="/recipes"
        className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Xem tất cả công thức
      </Link>
    </div>
  );
}
