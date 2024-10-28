import { describe, expect, it } from "vitest";
import { generateSecretHmac256 } from "../utils/webhook/customAuthHeader";

describe("generateSecretHmac256", () => {
  it("should generate a valid MAC header with correct structure and values", () => {
    const timestampSeconds = new Date("2024-01-01").getTime() / 1000;
    const nonce = "6b98df0d-5f33-4121-96cb-77a0b9df2bbe";

    const result = generateSecretHmac256({
      webhookUrl: "https://example.com/webhook",
      body: { bodyArgName: "bodyArgValue" },
      timestampSeconds,
      nonce,
      clientId: "testClientId",
      clientSecret: "testClientSecret",
    });

    expect(result).toEqual(
      `MAC id="testClientId" ts="1704067200000" nonce="6b98df0d-5f33-4121-96cb-77a0b9df2bbe" bodyhash="4Mknknli8NGCwC28djVf/Qa8vN3wtvfeRGKVha0MgjQ=" mac="Qbe9H5yeVvywoL3l1RFLBDC0YvDOCQnytNSlbTWXzEk="`,
    );
  });
});
