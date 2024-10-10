import { describe, expect, test } from "bun:test";
import { signMessage, toHex } from "thirdweb/utils";
import { ANVIL_PKEY_A } from "../../utils/wallets";
import { setup } from "../setup";

describe("signMessageRoute", () => {
  test("Sign a message (string)", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.backendWallet.signMessage(backendWallet, {
      message: "hello world",
    });

    const expected = signMessage({
      message: "hello world",
      privateKey: ANVIL_PKEY_A,
    });

    expect(res.result).toEqual(expected);
  });

  test("Sign a message (bytes)", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.backendWallet.signMessage(backendWallet, {
      message: toHex("hello world"),
      isBytes: true,
    });

    const expected = signMessage({
      message: "hello world",
      privateKey: ANVIL_PKEY_A,
    });

    expect(res.result).toEqual(expected);
  });
});
