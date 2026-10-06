import { recipeCreatedCounter, recipePublishedCounter } from './metrics';

describe('business metrics counters', () => {
  it('exposes a usable recipe_created_total counter', () => {
    expect(() => recipeCreatedCounter.add(1)).not.toThrow();
  });

  it('exposes a usable recipe_published_total counter', () => {
    expect(() => recipePublishedCounter.add(1)).not.toThrow();
  });
});
