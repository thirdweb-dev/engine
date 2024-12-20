import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import Fastify, { type FastifyInstance } from "fastify";
import type { setupEngine } from "../../utils/engine";
import { setup } from "../setup";
import { WebhooksEventTypes } from "../../../../src/shared/schemas/webhooks";

/**
 * steps to run
 * - build sdk: yarn generate:sdk (might need to cd sdk && yarn)
 * - run local server: yarn dev
 * - bun test  tests/e2e/tests/workers/address-balance-listener.test.ts
 */
describe("Webhook callback Address Balance Listener", () => {
  let testCallbackServer: FastifyInstance;
  let engine: ReturnType<typeof setupEngine>;
  // state to be updated by webhook callback
  let webhookCallbackState = false;

  beforeAll(async () => {
    engine = (await setup()).engine;
    testCallbackServer = await createTempCallbackServer();
  });

  afterAll(async () => {
    await testCallbackServer.close();
  });

  const createTempCallbackServer = async () => {
    const tempServer = Fastify();

    tempServer.post("/callback", async () => {
      const prevValue = webhookCallbackState;
      webhookCallbackState = !webhookCallbackState;
      return { prevValue, newValue: webhookCallbackState };
    });

    await tempServer.listen({ port: 3006 });

    return tempServer;
  };

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

  const testWithThreshold = async (
    thresholdBal: number,
    expectedOutput: string,
  ) => {
    const originalStateValue = webhookCallbackState;

    const whWrote = (
      await engine.webhooks.create({
        url: "http://localhost:3006/callback",
        name: "TEST:DELETE LATER:PAYMASTER BALANCE LIMIT NOTIFY",
        eventType: WebhooksEventTypes.BACKEND_WALLET_BALANCE,
        config: {
          address: "0xE52772e599b3fa747Af9595266b527A31611cebd",
          chainId: 137,
          threshold: thresholdBal,
        },
      })
    )?.result;

    const whRead = (await engine.webhooks.getAll()).result.find(
      (wh) => wh.id === whWrote.id,
    );

    // check if webhook is registered correctly
    expect(whRead?.id).toEqual(whWrote?.id);
    expect(whRead?.config?.address).toEqual(whWrote?.config?.address);
    expect(whRead?.config?.chainId).toEqual(whWrote?.config?.chainId);
    expect(whRead?.config?.threshold).toEqual(whWrote?.config?.threshold);

    let testStatus: string;
    try {
      const response = await checkTestStateChange();
      expect(response.status).toEqual(true);
      expect(response.newValue).not.toEqual(originalStateValue);
      expect(response.newValue).toEqual(webhookCallbackState);
      testStatus = "completed";
    } catch (e) {
      console.error(e);
      testStatus = "webhook not called";
    }

    // todo: delete api doesn't exist atm so only revoke for now. Dont delete manually.
    // await prisma.webhooks.delete({ where: { id: whRead?.id } });
    await engine.webhooks.revoke({ id: whRead.id });

    // should not throw error
    expect(testStatus).toEqual(expectedOutput);
  };

  test(
    "test should throw error as balance > threshold",
    async () => {
      await testWithThreshold(0.1, "webhook not called");
    },
    1000 * 60, // increase timeout
  );

  test(
    "test should call webhook as balance < threshold",
    async () => {
      await testWithThreshold(2000, "completed");
    },
    1000 * 60, // increase timeout
  );
});
