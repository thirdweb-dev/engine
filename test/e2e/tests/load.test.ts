import { describe, expect, test } from "bun:test";
import assert from "assert";
import { sleep } from "bun";
import { getAddress } from "viem";
import { CONFIG } from "../config";
import { printStats } from "../utils/statistics";
import {
  pollTransactionStatus,
  sendMintToTransaction,
  sendNoOpTransaction,
} from "../utils/transactions";
import { setup } from "./setup";

describe("Load Test Transactions", () => {
  test("Send NoOp Transactions", async () => {
    const { engine, backendWallet } = await setup();

    const timings = [];
    for (
      let i = 0;
      i < CONFIG.TRANSACTION_COUNT;
      i += CONFIG.TRANSACTIONS_PER_BATCH
    ) {
      const batch = await Promise.all(
        new Array(CONFIG.TRANSACTIONS_PER_BATCH)
          .fill(0)
          .map(() => sendNoOpTransaction(engine, backendWallet)),
      );
      timings.push(...batch);
      await sleep(1000);
    }

    const results = await Promise.all(
      timings.map(async (queueId) => {
        if (!queueId) return null;
        return pollTransactionStatus(engine, queueId);
      }),
    );

    const minedTimes = results.map((r) =>
      r ? (r.minedAt || 0) - (r.queuedAt || 0) : 0,
    );
    const sentTimes = results.map((r) =>
      r ? (r.sentAt || 0) - (r.queuedAt || 0) : 0,
    );

    printStats(minedTimes, sentTimes);

    expect(results.filter((r) => r !== null).length).toBe(
      CONFIG.TRANSACTION_COUNT,
    );
  });

  test("Send MintTo Transactions", async () => {
    const { engine, backendWallet } = await setup();

    // First, deploy an NFT contract
    const deployRes = await engine.deploy.deployNftCollection(
      CONFIG.CHAIN.id.toString(),
      backendWallet,
      {
        contractMetadata: {
          name: "Test NFT",
          symbol: "TNFT",
          fee_recipient: backendWallet,
          platform_fee_basis_points: 0,
          platform_fee_recipient: backendWallet,
          seller_fee_basis_points: 0,
          trusted_forwarders: [],
        },
      },
    );

    const nftContractAddress = deployRes.result.deployedAddress
      ? getAddress(deployRes.result.deployedAddress)
      : undefined;

    expect(nftContractAddress).toBeDefined();

    assert(nftContractAddress, "NFT contract address is not defined");

    // Wait for the contract to be deployed
    await pollTransactionStatus(engine, deployRes.result.queueId!);

    const timings = [];
    for (
      let i = 0;
      i < CONFIG.TRANSACTION_COUNT;
      i += CONFIG.TRANSACTIONS_PER_BATCH
    ) {
      const batch = await Promise.all(
        new Array(CONFIG.TRANSACTIONS_PER_BATCH)
          .fill(0)
          .map(() =>
            sendMintToTransaction(engine, nftContractAddress, backendWallet),
          ),
      );
      timings.push(...batch);
      await sleep(1000);
    }

    const results = await Promise.all(
      timings.map(async (queueId) => {
        if (!queueId) return null;
        return pollTransactionStatus(engine, queueId);
      }),
    );

    const minedTimes = results.map((r) =>
      r ? (r.minedAt || 0) - (r.queuedAt || 0) : 0,
    );
    const sentTimes = results.map((r) =>
      r ? (r.sentAt || 0) - (r.queuedAt || 0) : 0,
    );

    printStats(minedTimes, sentTimes);

    expect(results.filter((r) => r !== null).length).toBe(
      CONFIG.TRANSACTION_COUNT,
    );
  });
});
