import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('culinary-backend');

export const recipeCreatedCounter = meter.createCounter('recipe_created_total', {
  description: 'Số lượng công thức được tạo',
});

export const recipePublishedCounter = meter.createCounter('recipe_published_total', {
  description: 'Số lượng công thức được xuất bản',
});
