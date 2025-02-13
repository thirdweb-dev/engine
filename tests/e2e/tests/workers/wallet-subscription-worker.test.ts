import {
  beforeAll,
  afterAll,
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
} from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { setup } from "../setup";
import type { WalletSubscriptionWebhookParams } from "../../../../src/shared/schemas/webhooks";
import type { Engine } from "../../../../sdk/dist/thirdweb-dev-engine.cjs";
import type { WalletCondition } from "../../../../src/shared/schemas/wallet-subscription-conditions";
import { sleep } from "bun";

describe("Wallet Subscription Worker", () => {
  let testCallbackServer: FastifyInstance;
  let engine: Engine;
  let webhookPayloads: WalletSubscriptionWebhookParams[] = [];
  let webhookId: number;

  beforeAll(async () => {
    engine = (await setup()).engine;
    testCallbackServer = await createTempCallbackServer();

    // Create a webhook that we'll reuse for all tests
    const webhook = await engine.webhooks.create({
      url: "http://localhost:3006/callback",
      eventType: "wallet_subscription",
    });
    webhookId = webhook.result.id;
  });

  afterAll(async () => {
    await testCallbackServer.close();
  });

  beforeEach(() => {
    // Clear webhook payloads before each test
    webhookPayloads = [];
  });

  afterEach(async () => {
    await sleep(5000); // wait for any unsent webhooks to be sent
  });

  const createTempCallbackServer = async () => {
    const tempServer = Fastify();

    tempServer.post("/callback", async (request) => {
      const payload = request.body as WalletSubscriptionWebhookParams;
      webhookPayloads.push(payload);
      return { success: true };
    });

    await tempServer.listen({ port: 3006 });
    return tempServer;
  };

  const waitForWebhookPayloads = async (
    timeoutMs = 5000,
  ): Promise<WalletSubscriptionWebhookParams[]> => {
    // Wait for initial webhooks to come in
    await new Promise((resolve) => setTimeout(resolve, timeoutMs));
    return webhookPayloads;
  };

  const createSubscription = async (conditions: WalletCondition[]) => {
    const subscription = await engine.walletSubscriptions.addWalletSubscription(
      {
        chain: "137",
        walletAddress: "0xE52772e599b3fa747Af9595266b527A31611cebd",
        conditions,
        webhookId,
      },
    );

    return subscription.result;
  };

  test("should create and validate wallet subscription", async () => {
    const condition: WalletCondition = {
      type: "token_balance_lt",
      value: "100000000000000000", // 0.1 ETH
      tokenAddress: "native",
    };

    const subscription = await createSubscription([condition]);

    expect(subscription.chainId).toBe("137");
    expect(subscription.walletAddress.toLowerCase()).toBe(
      "0xE52772e599b3fa747Af9595266b527A31611cebd".toLowerCase(),
    );
    expect(subscription.conditions).toEqual([condition]);
    expect(subscription.webhook?.url).toBe("http://localhost:3006/callback");

    // Cleanup
    await engine.walletSubscriptions.deleteWalletSubscription(subscription.id);
  });

  test("should fire webhooks for token balance less than threshold", async () => {
    const condition: WalletCondition = {
      type: "token_balance_lt",
      value: "1000000000000000000000", // 1000 ETH (high threshold to ensure trigger)
      tokenAddress: "native",
    };

    const subscription = await createSubscription([condition]);

    try {
      const payloads = await waitForWebhookPayloads();

      // Verify we got webhooks
      expect(payloads.length).toBeGreaterThan(0);

      // Verify webhook data is correct
      for (const payload of payloads) {
        expect(payload.subscriptionId).toBe(subscription.id);
        expect(payload.chainId).toBe("137");
        expect(payload.walletAddress.toLowerCase()).toBe(
          "0xE52772e599b3fa747Af9595266b527A31611cebd".toLowerCase(),
        );
        expect(payload.condition).toEqual(condition);
        expect(BigInt(payload.currentValue)).toBeLessThan(
          BigInt(condition.value),
        );
      }
    } finally {
      await engine.walletSubscriptions.deleteWalletSubscription(
        subscription.id,
      );
    }
  });

  test("should fire webhooks for token balance greater than threshold", async () => {
    const condition: WalletCondition = {
      type: "token_balance_gt",
      value: "1000000000000", // Very small threshold to ensure trigger
      tokenAddress: "native",
    };

    const subscription = await createSubscription([condition]);

    try {
      const payloads = await waitForWebhookPayloads();

      // Verify we got webhooks
      expect(payloads.length).toBeGreaterThan(0);

      // Verify webhook data is correct
      for (const payload of payloads) {
        expect(payload.subscriptionId).toBe(subscription.id);
        expect(payload.chainId).toBe("137");
        expect(payload.walletAddress.toLowerCase()).toBe(
          "0xE52772e599b3fa747Af9595266b527A31611cebd".toLowerCase(),
        );
        expect(payload.condition).toEqual(condition);
        expect(BigInt(payload.currentValue)).toBeGreaterThan(
          BigInt(condition.value),
        );
      }
    } finally {
      await engine.walletSubscriptions.deleteWalletSubscription(
        subscription.id,
      );
    }
  });

  test("should fire webhooks for multiple conditions", async () => {
    const conditions: WalletCondition[] = [
      {
        type: "token_balance_gt",
        value: "1000000000000", // Very small threshold to ensure trigger
        tokenAddress: "native",
      },
      {
        type: "token_balance_lt",
        value: "1000000000000000000000", // 1000 ETH (high threshold to ensure trigger)
        tokenAddress: "native",
      },
    ];

    const subscription = await createSubscription(conditions);

    try {
      const payloads = await waitForWebhookPayloads();

      // Verify we got webhooks for both conditions
      expect(payloads.length).toBeGreaterThan(1);

      // Verify we got webhooks for both conditions
      const uniqueConditions = new Set(payloads.map((p) => p.condition.type));
      expect(uniqueConditions.size).toBe(2);

      // Verify each webhook has correct data
      for (const payload of payloads) {
        expect(payload.subscriptionId).toBe(subscription.id);
        expect(payload.chainId).toBe("137");
        expect(payload.walletAddress.toLowerCase()).toBe(
          "0xE52772e599b3fa747Af9595266b527A31611cebd".toLowerCase(),
        );
        expect(payload.currentValue).toBeDefined();

        // Verify the value satisfies the condition
        if (payload.condition.type === "token_balance_gt") {
          expect(BigInt(payload.currentValue)).toBeGreaterThan(
            BigInt(payload.condition.value),
          );
        } else {
          expect(BigInt(payload.currentValue)).toBeLessThan(
            BigInt(payload.condition.value),
          );
        }
      }
    } finally {
      await engine.walletSubscriptions.deleteWalletSubscription(
        subscription.id,
      );
    }
  });
});
