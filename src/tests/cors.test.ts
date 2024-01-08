import { sanitizeOrigin } from "../server/middleware/cors";

describe("sanitizeOrigin", () => {
  it("with leading and trailing slashes", () => {
    expect(sanitizeOrigin("/foobar/")).toEqual(RegExp("foobar"));
  });
  it("with leading wildcard", () => {
    expect(sanitizeOrigin("*.foobar.com")).toEqual(RegExp(".*.foobar.com"));
  });
  it("with thirdweb domains", () => {
    expect(sanitizeOrigin("https://thirdweb-preview.com")).toEqual(
      new RegExp(/^https?:\/\/.*\.thirdweb-preview\.com$/),
    );
    expect(sanitizeOrigin("https://thirdweb-dev.com")).toEqual(
      new RegExp(/^https?:\/\/.*\.thirdweb-dev\.com$/),
    );
  });
  it("with trailing slashes", () => {
    expect(sanitizeOrigin("https://foobar.com/")).toEqual("https://foobar.com");
  });
  it("fallback: don't change origin", () => {
    expect(sanitizeOrigin("https://foobar.com")).toEqual("https://foobar.com");
  });
});
