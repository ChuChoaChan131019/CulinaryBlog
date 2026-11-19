import type { DifficultyLevel, RecipeSummaryDto } from "@culinary/shared";
import { ChefHat, Clock } from "lucide-react";
import Link from "next/link";

const difficultyLabels: Record<DifficultyLevel, string> = {
  Easy: "Dễ",
  Medium: "Trung bình",
  Hard: "Khó",
};

const difficultyTones: Record<DifficultyLevel, string> = {
  Easy: "bg-accent-soft text-accent",
  Medium: "bg-primary-soft text-primary",
  Hard: "bg-ink text-ink-foreground",
};

export function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${difficultyTones[level]}`}>
      {difficultyLabels[level]}
    </span>
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function RecipeCard({ recipe }: { recipe: RecipeSummaryDto }) {
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  return (
    <Link
      href={`/recipes/${recipe.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {/* Ảnh do người dùng upload nên host không cố định; `next/image` cần khai báo
            trước remotePatterns, vì vậy dùng <img> thường cho tới khi FR-FILE chốt
            domain phát ảnh (#FR-FILE, module media). */}
        {recipe.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- xem ghi chú trên
          <img
            src={recipe.coverImageUrl}
            alt={recipe.title}
            loading="lazy"
            width={1200}
            height={900}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-muted-foreground">
            <ChefHat className="h-10 w-10" aria-hidden />
          </span>
        )}
        <span className="absolute left-3 top-3">
          <DifficultyBadge level={recipe.difficulty} />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {recipe.category.name}
        </p>
        <h3 className="mt-2 font-display text-lg leading-snug">{recipe.title}</h3>
        {recipe.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{recipe.excerpt}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-4 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-soft text-[11px] font-semibold text-foreground">
              {initials(recipe.author.displayName)}
            </span>
            <span className="truncate text-muted-foreground">{recipe.author.displayName}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden />
            Nấu: {recipe.cookTimeMinutes} phút · Tổng: {totalTime} phút
          </span>
        </div>
      </div>
    </Link>
  );
}
