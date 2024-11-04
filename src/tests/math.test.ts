import { describe, expect, it } from "vitest";
import { clamp, getPercentile } from "../utils/math";

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

describe("clamp", () => {
  it("clamps the value correctly below the minimum", () => {
    expect(clamp(0, { min: 2, max: 10 })).toBe(2);
  });

  it("clamps the value correctly at the minimum", () => {
    expect(clamp(2, { min: 2, max: 10 })).toBe(2);
  });

  it("returns the value when within bounds", () => {
    expect(clamp(3, { min: 2, max: 10 })).toBe(3);
  });

  it("clamps the value correctly at the maximum", () => {
    expect(clamp(10, { min: 2, max: 10 })).toBe(10);
  });

  it("clamps the value correctly above the maximum", () => {
    expect(clamp(12, { min: 2, max: 10 })).toBe(10);
  });
});
