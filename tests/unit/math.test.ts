import { describe, expect, it } from "vitest";
import { getPercentile } from "../../src/shared/utils/math";

describe("getPercentile", () => {
  it("should correctly calculate the p50 (median) of a sorted array", () => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(getPercentile(numbers, 50)).toBe(5);
  });

  it("should correctly calculate the p90 of a sorted array", () => {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(getPercentile(numbers, 90)).toBe(9);
  });

  it("should handle arrays with even number of elements", () => {
    const numbers = [10, 20, 30, 40, 50, 60, 70, 80];
    expect(getPercentile(numbers, 50)).toBe(40);
  });

  it("should handle single element array", () => {
    const numbers = [1];
    expect(getPercentile(numbers, 50)).toBe(1);
  });

  it("should handle empty array", () => {
    const numbers: number[] = [];
    expect(getPercentile(numbers, 50)).toBe(0);
  });
});
