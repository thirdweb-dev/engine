import { isLocalhost, parseArrayString } from "../utils/url";

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

describe("parseArrayString", () => {
  it("should return an empty array if no input is provided", () => {
    const result = parseArrayString();
    expect(result).toEqual([]);
  });

  it("should return an empty array if an empty string is provided", () => {
    const result = parseArrayString("");
    expect(result).toEqual([]);
  });

  it("should parse a comma-separated string into an array of strings", () => {
    const input = "apple,banana,orange";
    const expectedOutput = ["apple", "banana", "orange"];
    const result = parseArrayString(input);
    expect(result).toEqual(expectedOutput);
  });

  it("should trim whitespace from each element of the array", () => {
    const input = "  apple  ,  banana  ,  orange  ";
    const expectedOutput = ["apple", "banana", "orange"];
    const result = parseArrayString(input);
    expect(result).toEqual(expectedOutput);
  });

  it("should handle an array of strings as input", () => {
    const input = ["apple", "banana", "orange"];
    const expectedOutput = ["apple", "banana", "orange"];
    const result = parseArrayString(input);
    expect(result).toEqual(expectedOutput);
  });

  it("should handle an array of strings with whitespace", () => {
    const input = ["  apple  ", "  banana  ", "  orange  "];
    const expectedOutput = ["apple", "banana", "orange"];
    const result = parseArrayString(input);
    expect(result).toEqual(expectedOutput);
  });

  it("should handle a mix of comma-separated string and array input", () => {
    const input = ["apple", "banana", "orange", "grape,kiwi,melon"];
    const expectedOutput = [
      "apple",
      "banana",
      "orange",
      "grape",
      "kiwi",
      "melon",
    ];
    const result = parseArrayString(input);
    expect(result).toEqual(expectedOutput);
  });
});
