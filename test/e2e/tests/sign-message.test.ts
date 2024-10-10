import { describe, expect, test } from "bun:test";
import { setup } from "./setup";

describe("signMessage route", () => {
  test("Sign a message (string)", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.backendWallet.signMessage(backendWallet, {
      message: "hello world",
    });

    expect(res.result).toEqual(
      "0xa461f509887bd19e312c0c58467ce8ff8e300d3c1a90b608a760c5b80318eaf15fe57c96f9175d6cd4daad4663763baa7e78836e067d0163e9a2ccf2ff753f5b1b",
    );
  });

  test("Sign a message (bytes)", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.backendWallet.signMessage(backendWallet, {
      message: "0x68656c6c6f20776f726c64",
      isBytes: true,
    });

    expect(res.result).toEqual(
      "0xa461f509887bd19e312c0c58467ce8ff8e300d3c1a90b608a760c5b80318eaf15fe57c96f9175d6cd4daad4663763baa7e78836e067d0163e9a2ccf2ff753f5b1b",
    );
  });
});
