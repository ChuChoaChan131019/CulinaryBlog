import { describe, expect, it } from "vitest";
import {
  buildSearchHref,
  getSearchTermState,
  normalizeSearchQuery,
} from "./helpers";

describe("search query helpers", () => {
  it("chuẩn hóa khoảng trắng và giữ nguyên tiếng Việt có dấu", () => {
    const query = normalizeSearchQuery({ q: "  phở bò  ", page: "2" });

    expect(query).toMatchObject({ q: "phở bò", page: 2, termState: "valid" });
  });

  it("từ chối query rỗng, quá ngắn, quá dài và chỉ có ký tự đặc biệt", () => {
    expect(getSearchTermState("")).toBe("empty");
    expect(getSearchTermState("a")).toBe("tooShort");
    expect(getSearchTermState("*?_")).toBe("invalid");
    expect(getSearchTermState("a".repeat(201))).toBe("tooLong");
  });

  it("mã hóa URL và giữ query, filter, sort khi chuyển trang", () => {
    const href = buildSearchHref(
      normalizeSearchQuery({
        q: " phở bò ",
        categoryId: "f8050eb8-9d4b-4ce6-a94f-68b590119185",
        difficulty: "Medium",
        maxCookTime: "60",
        minServings: "2",
        sort: "-createdAt",
      }),
      3,
    );

    expect(href).toBe(
      "/search?q=ph%E1%BB%9F+b%C3%B2&page=3&categoryId=f8050eb8-9d4b-4ce6-a94f-68b590119185&difficulty=Medium&maxCookTime=60&minServings=2&sort=-createdAt",
    );
  });

  it("loại giá trị filter không hợp lệ khỏi request", () => {
    const query = normalizeSearchQuery({
      q: "pho",
      categoryId: "not-a-uuid",
      difficulty: "Impossible",
      maxCookTime: "0",
      minServings: "-1",
      sort: "rating",
    });

    expect(query).toMatchObject({
      categoryId: undefined,
      difficulty: undefined,
      maxCookTime: undefined,
      minServings: undefined,
      sort: "relevance",
    });
  });
});
