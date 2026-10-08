import type { DifficultyLevel } from "@culinary/shared";

export const PAGE_SIZE = 12;

export const SORT_VALUES = [
  "relevance",
  "-createdAt",
  "createdAt",
  "title",
  "-title",
  "cookTime",
  "-cookTime",
] as const;

export const DIFFICULTIES: DifficultyLevel[] = ["Easy", "Medium", "Hard"];

export const MAX_QUERY_LENGTH = 200;

export type SortValue = (typeof SORT_VALUES)[number];
export type SearchParams = Record<string, string | string[] | undefined>;
export type SearchTermState = "empty" | "tooShort" | "tooLong" | "invalid" | "valid";

export interface SearchPageQuery {
  q: string;
  page: number;
  categoryId?: string;
  difficulty?: DifficultyLevel;
  maxCookTime?: number;
  minServings?: number;
  sort: SortValue;
  termState: SearchTermState;
}

export type SearchHrefQuery = Pick<
  SearchPageQuery,
  "q" | "categoryId" | "difficulty" | "maxCookTime" | "minServings" | "sort"
>;

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function positiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function normalizePage(value: string | undefined): number {
  return positiveInteger(value) ?? 1;
}

export function normalizeSort(value: string | undefined): SortValue {
  return SORT_VALUES.includes(value as SortValue) ? (value as SortValue) : "relevance";
}

export function normalizeDifficulty(value: string | undefined): DifficultyLevel | undefined {
  return DIFFICULTIES.includes(value as DifficultyLevel)
    ? (value as DifficultyLevel)
    : undefined;
}

export function normalizeUuid(value: string | undefined): string | undefined {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined;
}

export function getSearchTermState(value: string): SearchTermState {
  if (!value) return "empty";
  const length = Array.from(value).length;
  if (length < 2) return "tooShort";
  if (length > MAX_QUERY_LENGTH) return "tooLong";
  return /[\p{L}\p{N}]/u.test(value) ? "valid" : "invalid";
}

export function normalizeSearchQuery(params: SearchParams): SearchPageQuery {
  const q = firstValue(params.q)?.trim() ?? "";

  return {
    q,
    page: normalizePage(firstValue(params.page)),
    categoryId: normalizeUuid(firstValue(params.categoryId)),
    difficulty: normalizeDifficulty(firstValue(params.difficulty)),
    maxCookTime: positiveInteger(firstValue(params.maxCookTime)),
    minServings: positiveInteger(firstValue(params.minServings)),
    sort: normalizeSort(firstValue(params.sort)),
    termState: getSearchTermState(q),
  };
}

export function buildSearchHref(query: SearchHrefQuery, page?: number): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (page && page > 1) params.set("page", String(page));
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.difficulty) params.set("difficulty", query.difficulty);
  if (query.maxCookTime !== undefined) params.set("maxCookTime", String(query.maxCookTime));
  if (query.minServings !== undefined) params.set("minServings", String(query.minServings));
  if (query.sort !== "relevance") params.set("sort", query.sort);
  const search = params.toString();
  return search ? `/search?${search}` : "/search";
}
