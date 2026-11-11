'use client';

import type { RecipeSummaryDto } from '@culinary/shared';
import { useEffect, useState } from 'react';
import { RecipeCard } from '@/components/RecipeCard';
import { apiGetPaged } from '@/lib/api';

export function RandomRecipeGrid({ initialRecipes }: { initialRecipes: RecipeSummaryDto[] }) {
  const [recipes, setRecipes] = useState(initialRecipes);

  useEffect(() => {
    let active = true;
    void apiGetPaged<RecipeSummaryDto>(
      '/recipes',
      { pageSize: 6, sort: 'random' },
      { cache: 'no-store' },
    ).then((result) => {
      if (active && result.data.length > 0) setRecipes(result.data);
    }).catch(() => {
      // Giữ nội dung đã render từ server khi API tạm thời không khả dụng.
    });

    return () => { active = false; };
  }, []);

  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
    </div>
  );
}
