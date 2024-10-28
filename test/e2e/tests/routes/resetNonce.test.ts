import { describe, expect, test } from "bun:test";
import { anvil } from "thirdweb/chains";
import { setup } from "../setup";

describe("resetNonceRoute", () => {
  test("Nonce is updated after resetting.", async () => {
    const { engine, backendWallet } = await setup();

    const nonce1 = await engine.backendWallet.getNonce(
      anvil.id.toString(),
      backendWallet,
    );
    expect(nonce1).toEqual(0);
  });
});
