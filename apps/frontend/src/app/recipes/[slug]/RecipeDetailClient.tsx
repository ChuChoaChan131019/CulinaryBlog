"use client";

import { ArrowLeft, ChefHat, Clock, Flame, Printer, RotateCcw, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGetPaged, ApiError } from "@/lib/api";
import { apiAuthed } from "@/lib/auth";
import { DifficultyBadge, RecipeCard } from "@/components/RecipeCard";
import {
  formatIngredient,
  formatNutrition,
  getImageUrl,
  getPrimaryImage,
  initials,
  totalTime,
} from "./recipe-detail.helpers";
import type { RecipeDetail, RelatedRecipe } from "./recipe-detail.helpers";

interface RecipeDetailClientProps {
  slug: string;
  initialRecipe: RecipeDetail | null;
  initialRelated: RelatedRecipe[];
  requiresAuth: boolean;
}

type PrivateState = "loading" | "ready" | "forbidden" | "not-found" | "error";

export default function RecipeDetailClient({
  slug,
  initialRecipe,
  initialRelated,
  requiresAuth,
}: RecipeDetailClientProps) {
  const [privateState, setPrivateState] = useState<PrivateState>(
    requiresAuth ? "loading" : "ready",
  );
  const [privateRecipe, setPrivateRecipe] = useState<RecipeDetail | null>(null);
  const [related, setRelated] = useState(initialRelated);

  useEffect(() => {
    if (!requiresAuth) return;
    let cancelled = false;

    void apiAuthed<RecipeDetail>(`/recipes/${encodeURIComponent(slug)}`)
      .then((recipe) => {
        if (cancelled) return;
        setPrivateRecipe(recipe);
        setPrivateState("ready");
        void loadRelated(recipe).then((items) => {
          if (!cancelled) setRelated(items);
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) setPrivateState("forbidden");
        else if (error instanceof ApiError && error.status === 404) setPrivateState("not-found");
        else setPrivateState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [requiresAuth, slug]);

  const recipe = privateRecipe ?? initialRecipe;
  if (requiresAuth && privateState === "loading") return <PrivateLoading />;
  if (privateState === "forbidden") return <ForbiddenState slug={slug} />;
  if (privateState === "not-found") return <MissingState />;
  if (privateState === "error") return <PrivateError slug={slug} />;
  if (!recipe) return <MissingState />;

  return <RecipeDetailView key={recipe.id} recipe={recipe} related={related} />;
}

async function loadRelated(recipe: RecipeDetail): Promise<RelatedRecipe[]> {
  try {
    const result = await apiGetPaged<RelatedRecipe>(
      "/recipes",
      { categoryId: recipe.category.id, pageSize: 4, sort: "-createdAt" },
      { cache: "no-store" },
    );
    return result.data.filter((item) => item.slug !== recipe.slug).slice(0, 3);
  } catch {
    return [];
  }
}

function RecipeDetailView({ recipe, related }: { recipe: RecipeDetail; related: RelatedRecipe[] }) {
  const primaryImage = getPrimaryImage(recipe.images);
  const [selectedImageId, setSelectedImageId] = useState(primaryImage?.id ?? null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const selectedImage = recipe.images.find((image) => image.id === selectedImageId) ?? primaryImage;
  const checkedCount = Object.values(checked).filter(Boolean).length;

  const total = totalTime(recipe);

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/recipes"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Tất cả công thức
      </Link>

      <header className="mt-6 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            {recipe.category.name}
          </span>
          <DifficultyBadge level={recipe.difficulty} />
          {recipe.status !== "Published" && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              {recipe.status === "Draft" ? "Bản nháp" : "Đã lưu trữ"}
            </span>
          )}
        </div>
        <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">{recipe.title}</h1>
        {recipe.description && (
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{recipe.description}</p>
        )}
      </header>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {recipe.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- host ảnh upload chưa cố định
            <img
              src={recipe.author.avatarUrl}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials(recipe.author.displayName)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{recipe.author.displayName}</p>
            <p className="text-xs text-muted-foreground">Tác giả công thức</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          aria-label="In công thức"
          className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <Printer className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-3xl border border-border shadow-card">
        {selectedImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- host ảnh upload chưa cố định
          <img
            src={getImageUrl(selectedImage, "medium")}
            alt={selectedImage.altText ?? recipe.title}
            width={1200}
            height={900}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div className="grid aspect-[16/9] place-items-center bg-secondary text-muted-foreground">
            <ChefHat className="h-12 w-12" aria-hidden />
            <span className="sr-only">Công thức chưa có ảnh</span>
          </div>
        )}
      </div>

      {recipe.images.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1" aria-label="Các ảnh của công thức">
          {recipe.images.map((image) => (
            <button
              key={image.id}
              type="button"
              aria-label={`Chọn ảnh ${image.altText ?? recipe.title}`}
              aria-current={image.id === selectedImage?.id}
              onClick={() => setSelectedImageId(image.id)}
              className={`shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                image.id === selectedImage?.id ? "border-primary" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- host ảnh upload chưa cố định */}
              <img
                src={getImageUrl(image, "thumbnail")}
                alt={image.altText ?? recipe.title}
                width={96}
                height={72}
                loading="lazy"
                className="h-16 w-24 object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Clock className="h-4 w-4" />} label="Chuẩn bị" value={`${recipe.prepTimeMinutes} phút`} />
        <Stat icon={<Flame className="h-4 w-4" />} label="Nấu" value={`${recipe.cookTimeMinutes} phút`} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Tổng" value={`${total} phút`} />
        <Stat icon={<Users className="h-4 w-4" />} label="Khẩu phần" value={`${recipe.servings}`} />
      </dl>

      <div className="mt-12 grid gap-10 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl">Nguyên liệu</h2>
              <span className="text-xs text-muted-foreground">
                {checkedCount}/{recipe.ingredients.length}
              </span>
            </div>
            <ul className="mt-4 space-y-1">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary">
                    <input
                      type="checkbox"
                      checked={Boolean(checked[ingredient.id])}
                      onChange={() =>
                        setChecked((current) => ({
                          ...current,
                          [ingredient.id]: !current[ingredient.id],
                        }))
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[oklch(0.6_0.12_158)]"
                    />
                    <span
                      className={`text-sm ${checked[ingredient.id] ? "text-muted-foreground line-through" : ""}`}
                    >
                      {formatIngredient(ingredient)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-ink p-6 text-ink-foreground shadow-card">
            <h2 className="font-display text-xl">Dinh dưỡng</h2>
            <p className="mt-1 text-xs opacity-70">Ước tính trên mỗi khẩu phần</p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Nutrient label="Calories" value={recipe.nutrition.calories} unit="kcal" />
              <Nutrient label="Protein" value={recipe.nutrition.protein} unit="g" />
              <Nutrient label="Carbs" value={recipe.nutrition.carbohydrates} unit="g" />
              <Nutrient label="Fat" value={recipe.nutrition.fat} unit="g" />
              <Nutrient label="Fiber" value={recipe.nutrition.fiber} unit="g" />
              <Nutrient label="Sodium" value={recipe.nutrition.sodium} unit="mg" />
            </div>
          </section>
        </aside>

        <section>
          {recipe.instructions.trim() && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-2xl">Hướng dẫn chung</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {recipe.instructions}
              </p>
            </div>
          )}
          <h2 className="mt-8 font-display text-2xl">Cách làm</h2>
          <ol className="mt-6 space-y-5">
            {recipe.steps.map((step) => (
              <li key={step.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">
                    {step.stepNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-display text-lg">{step.title || `Bước ${step.stepNumber}`}</h3>
                      {step.timerMinutes !== null && (
                        <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                          <Clock className="h-3 w-3" aria-hidden />
                          {step.timerMinutes} phút
                        </span>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                    {step.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- host ảnh upload chưa cố định
                      <img
                        src={step.imageUrl}
                        alt={`Ảnh minh họa bước ${step.stepNumber}`}
                        width={800}
                        height={500}
                        loading="lazy"
                        className="mt-4 max-h-72 w-full rounded-xl object-cover"
                      />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {related.length > 0 && (
        <section className="mt-20" aria-labelledby="related-recipes-heading">
          <h2 id="related-recipes-heading" className="font-display text-2xl">
            Có thể bạn cũng thích
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <RecipeCard key={item.id} recipe={item} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-display text-lg">{value}</dd>
    </div>
  );
}

function Nutrient({ label, value, unit }: { label: string; value: string | null; unit: string }) {
  return (
    <div className="rounded-xl bg-[oklch(1_0_0/0.08)] px-4 py-3">
      <p className="text-xs opacity-70">{label}</p>
      <p className="mt-0.5 font-display text-2xl">
        {formatNutrition(value)}
        <span className="ml-1 text-sm opacity-70">{unit}</span>
      </p>
    </div>
  );
}

function PrivateLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-busy="true">
      <span className="sr-only">Đang kiểm tra quyền xem công thức…</span>
      <div className="animate-pulse space-y-5">
        <div className="h-4 w-32 rounded bg-secondary" />
        <div className="h-12 max-w-2xl rounded bg-secondary" />
        <div className="aspect-[16/9] rounded-3xl bg-secondary" />
      </div>
    </div>
  );
}

function ForbiddenState({ slug }: { slug: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <ShieldAlert className="mx-auto h-10 w-10 text-primary" aria-hidden />
      <h1 className="mt-4 font-display text-3xl">Bạn không có quyền xem công thức này</h1>
      <p className="mt-3 text-muted-foreground">
        Đây là công thức riêng tư của tác giả hoặc chỉ dành cho quản trị viên.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={`/login?redirect=${encodeURIComponent(`/recipes/${slug}`)}`}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Đăng nhập
        </Link>
        <Link
          href="/recipes"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
        >
          Về danh sách
        </Link>
      </div>
    </div>
  );
}

function MissingState() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-3xl">Không tìm thấy công thức</h1>
      <p className="mt-3 text-muted-foreground">Công thức có thể đã bị xóa hoặc không còn khả dụng.</p>
      <Link
        href="/recipes"
        className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Xem tất cả công thức
      </Link>
    </div>
  );
}

function PrivateError({ slug }: { slug: string }) {
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-display text-3xl">Không thể tải công thức riêng tư</h1>
      <p className="mt-3 text-muted-foreground">Kết nối bị gián đoạn. Vui lòng thử lại.</p>
      <Link
        href={`/recipes/${encodeURIComponent(slug)}`}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Tải lại
      </Link>
    </div>
  );
}
