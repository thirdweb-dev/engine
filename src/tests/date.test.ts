import { describe, expect, it } from "vitest";
import { timeFromNow } from "../utils/date";

describe("timeFromNow", () => {
  it("should return a date 10 seconds from now", () => {
    const now = new Date();
    const futureDate = timeFromNow({ seconds: 10 });
    expect(futureDate.getTime()).toBeCloseTo(now.getTime() + 10 * 1000, -1);
  });

  it("should return a date 5 minutes from now", () => {
    const now = new Date();
    const futureDate = timeFromNow({ minutes: 5 });
    expect(futureDate.getTime()).toBeCloseTo(now.getTime() + 5 * 60 * 1000, -1);
  });

  it("should return a date 3 hours from now", () => {
    const now = new Date();
    const futureDate = timeFromNow({ hours: 3 });
    expect(futureDate.getTime()).toBeCloseTo(
      now.getTime() + 3 * 60 * 60 * 1000,
      -1,
    );
  });

  it("should return a date 2 days from now", () => {
    const now = new Date();
    const futureDate = timeFromNow({ days: 2 });
    expect(futureDate.getTime()).toBeCloseTo(
      now.getTime() + 2 * 24 * 60 * 60 * 1000,
      -1,
    );
  });

  it("should throw an error if no time unit is provided", () => {
    expect(() => timeFromNow({})).toThrow(
      "Invalid arguments: at least one time unit must be provided.",
    );
  });
});
