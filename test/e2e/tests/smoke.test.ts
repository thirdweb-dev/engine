import { describe, expect, test } from "bun:test";
import { CONFIG } from "../config";
import { pollTransactionStatus } from "../utils/transactions";
import { setup } from "./setup";

describe("Smoke Test", () => {
  test("Send NoOp Transaction", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.backendWallet.transfer(
      CONFIG.CHAIN.id.toString(),
      backendWallet,
      {
        amount: "0",
        to: backendWallet,
      },
    );

    const transactionStatus = await pollTransactionStatus(
      engine,
      res.result.queueId,
      true,
    );

    expect(transactionStatus.minedAt).toBeDefined();
    console.log("Transaction mined");
  });
});
