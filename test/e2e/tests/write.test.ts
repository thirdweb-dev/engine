import { beforeAll, describe, expect, test } from "bun:test";
import type { Address } from "thirdweb";
import { zeroAddress } from "viem";
import { CONFIG } from "../config";
import type { setupEngine } from "../utils/engine";
import { pollTransactionStatus } from "../utils/transactions";
import { setup } from "./setup";

describe("Write Tests", () => {
  let tokenContractAddress: string;
  let engine: ReturnType<typeof setupEngine>;
  let backendWallet: Address;

  beforeAll(async () => {
    const { engine: _engine, backendWallet: _backendWallet } = await setup();
    engine = _engine;
    backendWallet = _backendWallet;

    const res = await engine.deploy.deployToken(
      CONFIG.CHAIN.id.toString(),
      backendWallet,
      {
        contractMetadata: {
          name: "test token",
          platform_fee_basis_points: 0,
          platform_fee_recipient: zeroAddress,
          symbol: "TT",
          trusted_forwarders: [],
        },
      },
    );

    expect(res.result.queueId).toBeDefined();
    expect(res.result.deployedAddress).toBeDefined();

    const transactionStatus = await pollTransactionStatus(
      engine,
      res.result.queueId!,
      true,
    );

    expect(transactionStatus.minedAt).toBeDefined();
    tokenContractAddress = res.result.deployedAddress!;
    console.log("tokenContractAddress", tokenContractAddress);
  });

  test("Write to a contract with function name", async () => {
    const writeRes = await engine.contract.write(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWallet,
      {
        functionName: "setContractURI",
        args: ["https://test.com"],
      },
    );

    expect(writeRes.result.queueId).toBeDefined();

    const writeTransactionStatus = await pollTransactionStatus(
      engine,
      writeRes.result.queueId!,
      true,
    );

    expect(writeTransactionStatus.minedAt).toBeDefined();
  });

  test("Write to a contract with function signature", async () => {
    const writeRes = await engine.contract.write(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWallet,
      {
        functionName: "function setContractURI(string uri)",
        args: ["https://signature-test.com"],
      },
    );

    expect(writeRes.result.queueId).toBeDefined();

    const writeTransactionStatus = await pollTransactionStatus(
      engine,
      writeRes.result.queueId!,
      true,
    );

    expect(writeTransactionStatus.minedAt).toBeDefined();
  });

  test("Write to a contract with function abi", async () => {
    const writeRes = await engine.contract.write(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWallet,
      {
        functionName: "setContractURI",
        args: ["https://abi-test.com"],
        abi: [
          {
            inputs: [
              {
                name: "uri",
                type: "string",
              },
            ],
            name: "setContractURI",
            stateMutability: "nonpayable",
            type: "function",
            // outputs: [],
          },
        ],
      },
    );

    expect(writeRes.result.queueId).toBeDefined();

    const writeTransactionStatus = await pollTransactionStatus(
      engine,
      writeRes.result.queueId!,
      true,
    );

    expect(writeTransactionStatus.minedAt).toBeDefined();
  });

  test.only("Should throw error if function name is not found", async () => {
    try {
      await engine.contract.write(
        CONFIG.CHAIN.id.toString(),
        tokenContractAddress,
        backendWallet,
        {
          functionName: "nonExistentFunction",
          args: [""],
        },
      );
    } catch (e: any) {
      expect(e.message).toBe(
        `could not find function with name "nonExistentFunction" in abi`,
      );
    }
  });
});
