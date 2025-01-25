import type { Webhooks } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { WebhooksEventTypes } from "../../src/shared/schemas/webhooks";
import { generateRequestHeaders } from "../../src/shared/utils/webhook";
import { generateSecretHmac256 } from "../../src/shared/utils/customAuthHeader";

describe("generateSecretHmac256", () => {
  it("should generate a valid MAC header with correct structure and values", () => {
    const timestamp = new Date("2024-01-01");
    const nonce = "6b98df0d-5f33-4121-96cb-77a0b9df2bbe";

    const result = generateSecretHmac256({
      webhookUrl: "https://example.com/webhook",
      body: { bodyArgName: "bodyArgValue" },
      timestamp,
      nonce,
      clientId: "testClientId",
      clientSecret: "testClientSecret",
    });

    expect(result).toEqual(
      `MAC id="testClientId" ts="1704067200000" nonce="6b98df0d-5f33-4121-96cb-77a0b9df2bbe" bodyhash="4Mknknli8NGCwC28djVf/Qa8vN3wtvfeRGKVha0MgjQ=" mac="Qbe9H5yeVvywoL3l1RFLBDC0YvDOCQnytNSlbTWXzEk="`,
    );
  });
});

describe("generateRequestHeaders", () => {
  const webhook: Webhooks = {
    id: 42,
    name: "test webhook",
    url: "https://www.example.com/webhook",
    secret: "test-secret-string",
    eventType: WebhooksEventTypes.SENT_TX,
    createdAt: new Date(),
    updatedAt: new Date(),
    revokedAt: null,
  };
  const body = {
    name: "Alice",
    age: 25,
    occupation: ["Founder", "Developer"],
  };
  const timestamp = new Date("2024-01-01");

  it("Generate a consistent webhook header", () => {
    const result = generateRequestHeaders({ webhook, body, timestamp });

    expect(result).toEqual({
      Accept: "application/json",
      Authorization: "Bearer test-secret-string",
      "Content-Type": "application/json",
      "x-engine-signature":
        "ca272da65f1145b9cfadab6d55086ee458eccc03a2c5f7f5ea84094d95b219cc",
      "x-engine-timestamp": "1704067200",
    });
  });
});
