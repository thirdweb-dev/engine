import { describe, expect, test } from "bun:test";
import { setup } from "./setup";

describe("signTransaction route", () => {
  test("Sign an eip-1559 transaction", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.backendWallet.signTransaction(backendWallet, {
      transaction: {
        chainId: 137,
        to: "0x152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4",
        nonce: "42",
        gasLimit: "88000",
        maxFeePerGas: "2000000000",
        maxPriorityFeePerGas: "200000000",
        value: "0",
        type: 1,
      },
    });

    expect(res.result).toEqual(
      "0x02f86c81892a840bebc2008477359400830157c094152e208d08cd3ea1aa5d179b2e3eba7d1a733ef48080c001a0f3cda0e68063ed90044ca52d3f1c6f87063d86ecdd64aec7ac6d3858b4aac529a028329f0852d25ac90853b64a587159abc85b30a16b99006db45bf5f15a8735a4",
    );
  });
});
