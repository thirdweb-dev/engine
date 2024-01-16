import { isLocalhost } from "../utils/url";

describe("isLocalhost function", () => {
  test("should return true for localhost URL", () => {
    const localhostUrl = "http://localhost:3000/path";
    expect(isLocalhost(localhostUrl)).toBe(true);
  });

  test("should return true for 127.0.0.1 URL", () => {
    const ipUrl = "http://127.0.0.1:8080/path";
    expect(isLocalhost(ipUrl)).toBe(true);
  });

  test("should return false for external URL", () => {
    const externalUrl = "http://example.com/path";
    expect(isLocalhost(externalUrl)).toBe(false);
  });

  test("should return false for invalid URL", () => {
    const invalidUrl = "not_a_url";
    expect(isLocalhost(invalidUrl)).toBe(false);
  });
});
