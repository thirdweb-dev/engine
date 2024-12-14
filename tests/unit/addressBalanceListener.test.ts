import { describe, expect, it } from "vitest";

import type { CreateWebhooksParams } from "../../src/shared/db/webhooks/create-webhook";
import { insertWebhook } from "../../src/shared/db/webhooks/create-webhook";
import { WebhooksEventTypes } from "../../src/shared/schemas/webhooks";
import { getWebhook } from "../../src/shared/db/webhooks/get-webhook";
import { prisma } from "../../src/shared/db/client";

/**
 * todo: remove all dependencies including tests after everything is migrated properly.
 */
describe("Address Balance Listener", () => {
  it("test create/get webhook with config property", async () => {
    const data: CreateWebhooksParams = {
      url: "http://localhost:3005/slack/notify",
      name: "PAYMASTER BALANCE LIMIT NOTIFY",
      eventType: WebhooksEventTypes.BACKEND_WALLET_BALANCE,
      config: {
        address: "0x1234...5678",
        chainId: 137,
        threshold: 10,
      },
    };
    const whWrote = await insertWebhook(data);
    const whRead = await getWebhook(whWrote.id);

    expect(whRead?.id).eq(whWrote.id);
    expect(whRead?.config?.chainId).eq(whWrote?.config?.chainId);

    // removes added test webhook from db
    await prisma.webhooks.delete({ where: { id: whRead?.id } });
  });
});
