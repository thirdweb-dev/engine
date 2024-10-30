import { describe, expect, it } from "vitest";
import { isValidWebhookUrl } from "../server/utils/validator";

describe("isValidWebhookUrl", () => {
  it("should return true for a valid HTTPS URL", () => {
    expect(isValidWebhookUrl("https://example.com")).toBe(true);
  });

  it("should return false for an HTTP URL", () => {
    expect(isValidWebhookUrl("http://example.com")).toBe(false);
  });

  it("should return false for a URL without protocol", () => {
    expect(isValidWebhookUrl("example.com")).toBe(false);
  });

  it("should return false for an invalid URL", () => {
    expect(isValidWebhookUrl("invalid-url")).toBe(false);
  });

  it("should return false for a URL with a different protocol", () => {
    expect(isValidWebhookUrl("ftp://example.com")).toBe(false);
  });

  it("should return false for an empty string", () => {
    expect(isValidWebhookUrl("")).toBe(false);
  });
});
