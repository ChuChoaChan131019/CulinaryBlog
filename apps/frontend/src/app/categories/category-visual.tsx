"use client";

import type { CategoryDto } from "@culinary/shared";
import { CategoryIcon } from "@/components/CategoryIcon";

interface CategoryVisualProps {
  category: CategoryDto;
  className?: string;
  iconClassName?: string;
}

export function CategoryVisual({
  category,
  className,
  iconClassName = "h-6 w-6",
}: CategoryVisualProps) {
  const imageUrl = category.imageUrl?.trim();

  return (
    <span
      className={`relative grid place-items-center overflow-hidden bg-primary-soft text-primary ${className ?? ""}`}
    >
      <CategoryIcon name={category.name} className={iconClassName} />
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- category image URL comes from the API.
        <img
          src={imageUrl}
          alt={category.name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
}
