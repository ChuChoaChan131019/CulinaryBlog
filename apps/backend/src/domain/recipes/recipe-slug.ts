export class RecipeSlug {
  static fromTitle(title: string): string {
    return title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'cong-thuc';
  }

  static withSuffix(base: string, suffix: number): string {
    const suffixText = suffix === 0 ? '' : `-${suffix}`;
    return `${base.slice(0, 220 - suffixText.length)}${suffixText}`;
  }
}
