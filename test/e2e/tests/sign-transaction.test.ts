import { describe, expect, test } from "bun:test";
import { setup } from "./setup";

describe("signTransaction route", () => {
  test("Sign a legacy transaction", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.backendWallet.signTransaction(backendWallet, {
      transaction: {
        type: 0,
        chainId: 1,
        to: "0x152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4",
        nonce: "42",
        gasLimit: "88000",
        gasPrice: "2000000000",
        value: "100000000000000000",
      },
    });

    expect(res.result).toEqual(
      "0xf86c2a8477359400830157c094152e208d08cd3ea1aa5d179b2e3eba7d1a733ef488016345785d8a00008026a05da3d31d9cfbb4026b6e187c81952199d567e182d9c2ecc72acf98e4e6ce4875a03b2815b79881092ab5a4f74e6725081d652becad8495b815c14abb56cc782041",
    );
  });

  test("Sign an eip-1559 transaction", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.backendWallet.signTransaction(backendWallet, {
      transaction: {
        type: 1,
        chainId: 137,
        to: "0x152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4",
        nonce: "42",
        gasLimit: "88000",
        maxFeePerGas: "2000000000",
        maxPriorityFeePerGas: "200000000",
        value: "100000000000000000",
        accessList: [
          {
            address: "0x152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4",
            storageKeys: [
              "0x0000000000000000000000000000000000000000000000000000000000000001",
            ],
          },
        ],
      },
    });

    expect(res.result).toEqual(
      "0x02f8ad81892a840bebc2008477359400830157c094152e208d08cd3ea1aa5d179b2e3eba7d1a733ef488016345785d8a000080f838f794152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4e1a0000000000000000000000000000000000000000000000000000000000000000180a050fd32589ec2e2b49b3bce79d9420474115490ea0693ada75a62d003c6ada1aaa06fbc93d08a7604fbca5c31af92a662ff6be3b5a9f75214b7cd5db5feab2fc444",
    );
  });

  test("Sign an eip-2930 transaction", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.backendWallet.signTransaction(backendWallet, {
      transaction: {
        type: 2,
        chainId: 137,
        to: "0x152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4",
        nonce: "42",
        gasLimit: "88000",
        value: "100000000000000000",
        accessList: [
          {
            address: "0x152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4",
            storageKeys: [
              "0x0000000000000000000000000000000000000000000000000000000000000001",
            ],
          },
        ],
      },
    });

    expect(res.result).toEqual(
      "0x01f8a481892a80830157c094152e208d08cd3ea1aa5d179b2e3eba7d1a733ef488016345785d8a000080f838f794152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4e1a0000000000000000000000000000000000000000000000000000000000000000101a0f690bdfb3b8431125dcb77933d3ebb0e5ae05bbd04ad83fa47b2f524013d4c0aa0096ca32df9a7586a4a11ebb72ce8e1902d633976a56ca184ae5009ae53c6bd16",
    );
  });

  test("Sign an eip-4844 transaction", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.backendWallet.signTransaction(backendWallet, {
      transaction: {
        type: 3,
        chainId: 137,
        to: "0x152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4",
        nonce: "42",
        gasLimit: "88000",
        maxFeePerGas: "2000000000",
        maxPriorityFeePerGas: "200000000",
        value: "100000000000000000",
        accessList: [
          {
            address: "0x152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4",
            storageKeys: [
              "0x0000000000000000000000000000000000000000000000000000000000000001",
            ],
          },
        ],
      },
    });

    expect(res.result).toEqual(
      "0x03f8af81892a840bebc2008477359400830157c094152e208d08cd3ea1aa5d179b2e3eba7d1a733ef488016345785d8a000080f838f794152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4e1a0000000000000000000000000000000000000000000000000000000000000000180c001a0ec4fd401847092409ffb584cc34e816a322d0bc20f3599b4fe0a0182947fe5bea048daaf620c8b765c07b16ba083c457a90fa54062039d5d1c484e81d1577cc642",
    );
  });

  test("Sign an eip-7702 transaction", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.backendWallet.signTransaction(backendWallet, {
      transaction: {
        type: 4,
        chainId: 137,
        to: "0x152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4",
        nonce: "42",
        gasLimit: "88000",
        maxFeePerGas: "2000000000",
        maxPriorityFeePerGas: "200000000",
        value: "100000000000000000",
        accessList: [
          {
            address: "0x152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4",
            storageKeys: [
              "0x0000000000000000000000000000000000000000000000000000000000000001",
            ],
          },
        ],
        customData: {
          someCustomField: "customValue",
        },
      },
    });

    expect(res.result).toEqual(
      "0x04f8ae81892a840bebc2008477359400830157c094152e208d08cd3ea1aa5d179b2e3eba7d1a733ef488016345785d8a000080f838f794152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4e1a00000000000000000000000000000000000000000000000000000000000000001c080a028b866bcf94201d63d71d46505a17a9341d2c7c0f25f98f8e99d5a045b6dd342a03e8807e857830b3e09b300a87c7fedacecc81c3e2222a017be2e0573be011977",
    );
  });
});
