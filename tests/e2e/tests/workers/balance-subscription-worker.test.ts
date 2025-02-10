import { beforeAll, afterAll, describe, expect, test } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { setup } from "../setup";
import type { BalanceSubscriptionWebhookParams } from "../../../../src/shared/schemas/webhooks";
import type { Engine } from "../../../../sdk/dist/thirdweb-dev-engine.cjs";

describe("Balance Subscription Worker", () => {
  let testCallbackServer: FastifyInstance;
  let engine: Engine;
  // state to be updated by webhook callback
  let lastWebhookPayload: BalanceSubscriptionWebhookParams | null = null;

  beforeAll(async () => {
    engine = (await setup()).engine;
    testCallbackServer = await createTempCallbackServer();
  });

  afterAll(async () => {
    await testCallbackServer.close();
  });

  const createTempCallbackServer = async () => {
    const tempServer = Fastify();

    tempServer.post("/callback", async (request) => {
      console.log(request.body);
      lastWebhookPayload = request.body as BalanceSubscriptionWebhookParams;
      return { success: true };
    });

    await tempServer.listen({ port: 3006 });

    return tempServer;
  };

  // helper to fetch updated state value after webhook callback
  const waitForWebhookCallback = async (): Promise<{
    status: boolean;
    payload?: BalanceSubscriptionWebhookParams;
  }> => {
    return await new Promise((res, rej) => {
      // check for webhook payload update
      const interval = setInterval(() => {
        if (!lastWebhookPayload) return;
        clearInterval(interval);
        res({ status: true, payload: lastWebhookPayload });
      }, 250);

      // reject if its taking too long to update state
      setTimeout(() => {
        rej({ status: false });
      }, 1000 * 30);
    });
  };

  const testWithThreshold = async (
    minBalance: string,
    maxBalance: string,
    expectedToTrigger: boolean,
  ) => {
    // Reset webhook payload
    lastWebhookPayload = null;

    // Create balance subscription
    const subscription = (
      await engine.balanceSubscriptions.addBalanceSubscription({
        chain: "137",
        walletAddress: "0xE52772e599b3fa747Af9595266b527A31611cebd",
        config: {
          threshold: {
            min: minBalance,
            max: maxBalance,
          },
        },
        webhookUrl: "http://localhost:3006/callback",
      })
    ).result;

    // Check if subscription is created correctly
    expect(subscription.chain).toEqual("137");
    expect(subscription.walletAddress.toLowerCase()).toEqual(
      "0xE52772e599b3fa747Af9595266b527A31611cebd".toLowerCase(),
    );
    expect(subscription.config.threshold?.min).toEqual(minBalance);
    expect(subscription.config.threshold?.max).toEqual(maxBalance);
    expect(subscription.webhook?.url).toEqual("http://localhost:3006/callback");

    let testStatus: string;
    try {
      const response = await waitForWebhookCallback();
      if (expectedToTrigger) {
        expect(response.status).toEqual(true);
        expect(response.payload).toBeDefined();
        expect(response.payload?.subscriptionId).toEqual(subscription.id);
        expect(response.payload?.chainId).toEqual("137");
        expect(response.payload?.walletAddress.toLowerCase()).toEqual(
          "0xE52772e599b3fa747Af9595266b527A31611cebd".toLowerCase(),
        );
        expect(response.payload?.balance).toBeDefined();
        expect(response.payload?.config).toEqual(subscription.config);
        testStatus = "completed";
      } else {
        testStatus = "webhook not called";
      }
    } catch (e) {
      console.error(e);
      testStatus = "webhook not called";
    }

    // Cleanup
    await engine.balanceSubscriptions.removeBalanceSubscription({
      balanceSubscriptionId: subscription.id,
    });

    // Verify test outcome
    expect(testStatus).toEqual(
      expectedToTrigger ? "completed" : "webhook not called",
    );
  };

  test(
    "should not trigger webhook when balance is within thresholds",
    async () => {
      // Set thresholds that the current balance should be between
      await testWithThreshold(
        "100000000000000000", // 0.1 ETH
        "10000000000000000000", // 10 ETH
        false,
      );
    },
    1000 * 60, // increase timeout
  );

  test(
    "should trigger webhook when balance is below min threshold",
    async () => {
      // Set min threshold higher than current balance
      await testWithThreshold(
        "1000000000000000000000", // 1000 ETH
        "10000000000000000000000", // 10000 ETH
        true,
      );
    },
    1000 * 60,
  );

  test(
    "should trigger webhook when balance is above max threshold",
    async () => {
      // Set max threshold lower than current balance
      await testWithThreshold(
        "10000000000000000", // 0.01 ETH
        "100000000000000000", // 0.1 ETH
        true,
      );
    },
    1000 * 60,
  );
});
