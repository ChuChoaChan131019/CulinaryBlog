import { RecipeSlug } from './recipe-slug';

describe('RecipeSlug', () => {
  it('normalizes Vietnamese titles and keeps suffixed slugs within the database limit', () => {
    expect(RecipeSlug.fromTitle('Đậu hũ sốt cà chua')).toBe('dau-hu-sot-ca-chua');
    expect(RecipeSlug.withSuffix('a'.repeat(220), 1)).toHaveLength(220);
    expect(RecipeSlug.withSuffix('a'.repeat(220), 1).endsWith('-1')).toBe(true);
  });
});
