import {
  CakeSlice,
  Croissant,
  CupSoda,
  EggFried,
  Flame,
  Salad,
  Soup,
  Utensils,
  Wheat,
} from "lucide-react";

// Giữ các tên icon của mockup để component vẫn port được dữ liệu cũ; CategoryDto hiện tại
// không có field icon nên trang thật dùng thêm nhóm keyword bên dưới để suy ra icon từ name.
const namedIcons = {
  CakeSlice,
  Croissant,
  CupSoda,
  EggFried,
  Flame,
  Salad,
  Soup,
  Wheat,
} as const;

const rules: [RegExp, typeof Utensils][] = [
  [/tráng miệng|dessert|ngọt|kem/i, CakeSlice],
  [/bánh|bake|nướng bánh/i, Croissant],
  [/súp|soup|canh|cháo/i, Soup],
  [/salad|rau|chay|vegan/i, Salad],
  [/uống|drink|nước|cà phê|trà/i, CupSoda],
  [/sáng|breakfast|trứng/i, EggFried],
  [/nướng|grill|bbq|cay/i, Flame],
  [/mì|bún|phở|cơm|pasta|noodle/i, Wheat],
];

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon =
    namedIcons[name as keyof typeof namedIcons] ??
    rules.find(([pattern]) => pattern.test(name))?.[1] ??
    Utensils;
  return <Icon className={className} aria-hidden />;
}
