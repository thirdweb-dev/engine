import { describe, expect, it } from "vitest";
import { BigIntMath, getPercentile } from "../../src/shared/utils/math";

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

describe("BigIntMath", () => {
  describe("min", () => {
    it("should return the smaller of two positive numbers", () => {
      const a = 5n;
      const b = 10n;
      expect(BigIntMath.min(a, b)).toBe(5n);
    });

    it("should return the smaller of two negative numbers", () => {
      const a = -10n;
      const b = -5n;
      expect(BigIntMath.min(a, b)).toBe(-10n);
    });

    it("should handle equal numbers", () => {
      const a = 5n;
      const b = 5n;
      expect(BigIntMath.min(a, b)).toBe(5n);
    });

    it("should handle zero and positive number", () => {
      const a = 0n;
      const b = 5n;
      expect(BigIntMath.min(a, b)).toBe(0n);
    });

    it("should handle zero and negative number", () => {
      const a = 0n;
      const b = -5n;
      expect(BigIntMath.min(a, b)).toBe(-5n);
    });

    it("should handle very large numbers", () => {
      const a = BigInt(Number.MAX_SAFE_INTEGER) * 2n;
      const b = BigInt(Number.MAX_SAFE_INTEGER);
      expect(BigIntMath.min(a, b)).toBe(b);
    });
  });

  describe("max", () => {
    it("should return the larger of two positive numbers", () => {
      const a = 5n;
      const b = 10n;
      expect(BigIntMath.max(a, b)).toBe(10n);
    });

    it("should return the larger of two negative numbers", () => {
      const a = -10n;
      const b = -5n;
      expect(BigIntMath.max(a, b)).toBe(-5n);
    });

    it("should handle equal numbers", () => {
      const a = 5n;
      const b = 5n;
      expect(BigIntMath.max(a, b)).toBe(5n);
    });

    it("should handle zero and positive number", () => {
      const a = 0n;
      const b = 5n;
      expect(BigIntMath.max(a, b)).toBe(5n);
    });

    it("should handle zero and negative number", () => {
      const a = 0n;
      const b = -5n;
      expect(BigIntMath.max(a, b)).toBe(0n);
    });

    it("should handle very large numbers", () => {
      const a = BigInt(Number.MAX_SAFE_INTEGER) * 2n;
      const b = BigInt(Number.MAX_SAFE_INTEGER);
      expect(BigIntMath.max(a, b)).toBe(a);
    });
  });
});
