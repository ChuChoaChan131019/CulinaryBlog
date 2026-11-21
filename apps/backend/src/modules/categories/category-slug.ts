export const CATEGORY_SLUG_MAX_LENGTH = 120;
export const CATEGORY_SLUG_FALLBACK = 'danh-muc';

/** Sinh slug từ tên danh mục: bỏ dấu tiếng Việt, chữ thường, nối bằng gạch ngang (FR-CAT-003). */
export function slugifyCategoryName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slug gốc của danh mục, dùng slug dự phòng khi tên không còn ký tự hợp lệ. */
export function categorySlugBase(name: string): string {
  return slugifyCategoryName(name) || CATEGORY_SLUG_FALLBACK;
}

/** Ghép hậu tố trùng (-2, -3, …) mà vẫn giữ slug trong giới hạn độ dài cột. */
export function withCategorySlugSuffix(base: string, suffix: number): string {
  const suffixText = suffix === 0 ? '' : `-${suffix}`;
  return `${base.slice(0, CATEGORY_SLUG_MAX_LENGTH - suffixText.length)}${suffixText}`;
}

export function nextCategorySlugSuffix(suffix: number): number {
  return suffix === 0 ? 2 : suffix + 1;
}
