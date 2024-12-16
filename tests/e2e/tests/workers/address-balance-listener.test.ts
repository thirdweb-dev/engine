import { beforeAll, describe, expect, test } from "bun:test";
import { setup } from "../setup";
import { insertWebhook } from "../../../../src/shared/db/webhooks/create-webhook";
import { WebhooksEventTypes } from "../../../../src/shared/schemas/webhooks";
import { getWebhook } from "../../../../src/shared/db/webhooks/get-webhook";
import { prisma } from "../../../../src/shared/db/client";
import { webhookCallbackState } from "../../../../src/server/routes/webhooks/test";

import type { setupEngine } from "../../utils/engine";

// helper to fetch updated state value after webhook callback
const checkTestStateChange = async (): Promise<{
  status: boolean;
  newValue?: boolean;
}> => {
  const originalState = webhookCallbackState;
  return await new Promise((res, rej) => {
    // check for test state update
    const interval = setInterval(() => {
      if (originalState === webhookCallbackState) return;
      clearInterval(interval);
      res({ status: true, newValue: webhookCallbackState });
    }, 250);

    // reject if its taking too long to update state.
    setTimeout(() => {
      rej({ status: false });
    }, 1000 * 30);
  });
};

describe("Webhook callback Address Balance Listener", () => {
  let engine: ReturnType<typeof setupEngine>;

  beforeAll(async () => {
    const setupRes = await setup();
    engine = setupRes.engine;
  });

  test(
    "test webhook callback when address balance goes below threshold",
    async () => {
      const originalStateValue = webhookCallbackState;

      const whWrote = await insertWebhook({
        url: "http://localhost:3005/webhooks/testWebhookCallback",
        name: "PAYMASTER BALANCE LIMIT NOTIFY",
        eventType: WebhooksEventTypes.BACKEND_WALLET_BALANCE,
        config: {
          address: "0xE52772e599b3fa747Af9595266b527A31611cebd",
          chainId: 137,
          threshold: 2000, // high number to make sure its tiggered
        },
      });
      const whRead = await getWebhook(whWrote.id);

      // check if webhook is registered correctly
      expect(whRead?.id).eq(whWrote.id);
      expect(whRead?.config?.chainId).eq(whWrote?.config?.chainId);

      let testStatus: string;
      try {
        const response = await checkTestStateChange();
        expect(response.status).eq(true);
        expect(response.newValue).not.eq(originalStateValue);
        expect(response.newValue).eq(webhookCallbackState);
        testStatus = "completed";
      } catch (e) {
        console.error(e);
        testStatus = "webhook not called";
      }

      // removes added test webhook from db
      await prisma.webhooks.delete({ where: { id: whRead?.id } });

      // should not throw error
      expect(testStatus).eq("completed");
    },
    1000 * 60, // increase timeout
  );
});
