import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { getErrorStateMessage, toErrorStateInfo } from "./error-state";

describe("error state", () => {
  it("hides server details and returns a friendly message for 5xx", () => {
    const info = toErrorStateInfo(new ApiError(500, {
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
      detail: "database password leaked in detail",
    }));

    expect(info).toMatchObject({ status: 500 });
    expect(info.message).toBeUndefined();
    expect(getErrorStateMessage(info)).toContain("Máy chủ đang bận");
  });

  it("maps rate limiting to an actionable message", () => {
    const info = toErrorStateInfo(new ApiError(429, null));

    expect(getErrorStateMessage(info)).toContain("quá nhiều yêu cầu");
  });

  it("does not expose unknown runtime errors", () => {
    expect(toErrorStateInfo(new Error("internal stack"))).toEqual({});
  });
});
