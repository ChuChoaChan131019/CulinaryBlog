import { describe, expect, it } from "vitest";
import {
  formatIngredient,
  formatNutrition,
  getImageUrl,
  getPrimaryImage,
  initials,
} from "./recipe-detail.helpers";

const images = [
  {
    id: "secondary",
    originalUrl: "https://cdn.test/secondary.jpg",
    mediumUrl: null,
    thumbnailUrl: "https://cdn.test/secondary-thumb.jpg",
    altText: null,
    isPrimary: false,
    orderIndex: 2,
  },
  {
    id: "primary",
    originalUrl: "https://cdn.test/primary.jpg",
    mediumUrl: "https://cdn.test/primary-medium.jpg",
    thumbnailUrl: "https://cdn.test/primary-thumb.jpg",
    altText: "Món ăn",
    isPrimary: true,
    orderIndex: 1,
  },
];

describe("recipe detail helpers", () => {
  it("chọn ảnh primary và fallback URL theo variant", () => {
    const primary = getPrimaryImage(images);
    expect(primary?.id).toBe("primary");
    expect(getImageUrl(primary, "medium")).toBe("https://cdn.test/primary-medium.jpg");
    expect(getImageUrl(images[0], "medium")).toBe("https://cdn.test/secondary.jpg");
  });

  it("ghép nguyên liệu mà không tạo khoảng trắng hoặc chữ null", () => {
    expect(
      formatIngredient({
        id: "1",
        name: "cà chua",
        quantity: "2",
        unit: "quả",
        notes: "băm nhỏ",
        orderIndex: 1,
      }),
    ).toBe("2 quả cà chua (băm nhỏ)");
    expect(
      formatIngredient({
        id: "2",
        name: "muối",
        quantity: null,
        unit: null,
        notes: null,
        orderIndex: 2,
      }),
    ).toBe("muối");
  });

  it("hiển thị dấu gạch ngang cho dinh dưỡng nullable và tạo initials", () => {
    expect(formatNutrition(null)).toBe("—");
    expect(formatNutrition(" 12.5 ")).toBe("12.5");
    expect(initials("Nguyễn Thị Minh Anh")).toBe("MA");
  });
});
