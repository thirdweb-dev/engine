import { beforeAll, describe, expect, test } from "bun:test";
import assert from "node:assert";
import { stringToHex, type Address } from "thirdweb";
import { zeroAddress } from "viem";
import type { ApiError } from "../../../../sdk/dist/thirdweb-dev-engine.cjs.js";
import { CONFIG } from "../../config";
import type { setupEngine } from "../../utils/engine";
import { pollTransactionStatus } from "../../utils/transactions";
import { setup } from "../setup";

describe("/contract/write route", () => {
  let tokenContractAddress: string;
  let engine: ReturnType<typeof setupEngine>;
  let backendWallet: Address;

  beforeAll(async () => {
    const { engine: _engine, backendWallet: _backendWallet } = await setup();
    engine = _engine;
    backendWallet = _backendWallet as Address;

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
    assert(res.result.queueId, "queueId must be defined");
    expect(res.result.deployedAddress).toBeDefined();

    const transactionStatus = await pollTransactionStatus(
      engine,
      res.result.queueId,
      true,
    );

    expect(transactionStatus.minedAt).toBeDefined();
    assert(res.result.deployedAddress, "deployedAddress must be defined");
    tokenContractAddress = res.result.deployedAddress;
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
      writeRes.result.queueId,
      true,
    );

    expect(writeTransactionStatus.minedAt).toBeDefined();
  });

  test("Write to a contract with untyped args", async () => {
    const res = await engine.deploy.deployNftDrop(
      CONFIG.CHAIN.id.toString(),
      backendWallet,
      {
        contractMetadata: {
          name: "test token",
          platform_fee_basis_points: 0,
          platform_fee_recipient: zeroAddress,
          symbol: "TT",
          trusted_forwarders: [],
          seller_fee_basis_points: 0,
          fee_recipient: zeroAddress,
        },
      },
    );

    expect(res.result.queueId).toBeDefined();
    assert(res.result.queueId, "queueId must be defined");
    expect(res.result.deployedAddress).toBeDefined();
    const nftDropContractAddress = res.result.deployedAddress;

    if (!nftDropContractAddress) {
      throw new Error("nftDropContractAddress must be defined");
    }

    const transactionStatus = await pollTransactionStatus(
      engine,
      res.result.queueId,
      true,
    );

    expect(transactionStatus.minedAt).toBeDefined();
    const writeRes = await engine.contract.write(
      CONFIG.CHAIN.id.toString(),
      nftDropContractAddress,
      backendWallet,
      {
        functionName: "setApprovalForAll",
        args: [
          "0x1234567890123456789012345678901234567890",
          "true", // string instead of bool
        ],
      },
    );

    expect(writeRes.result.queueId).toBeDefined();

    const writeTransactionStatus = await pollTransactionStatus(
      engine,
      writeRes.result.queueId,
      true,
    );

    expect(writeTransactionStatus.minedAt).toBeDefined();

    const writeRes2 = await engine.contract.write(
      CONFIG.CHAIN.id.toString(),
      nftDropContractAddress,
      backendWallet,
      {
        functionName: "setClaimConditions",
        args: [
          // stringified array of structs
          JSON.stringify([
            {
              startTimestamp: "0",
              maxClaimableSupply: "100000",
              supplyClaimed: "0",
              quantityLimitPerWallet: "10",
              merkleRoot: stringToHex("", { size: 32 }),
              pricePerToken: "0",
              currency: zeroAddress,
              metadata: "",
            },
          ]),
          "false",
        ],
      },
    );

    expect(writeRes2.result.queueId).toBeDefined();

    const writeTransactionStatus2 = await pollTransactionStatus(
      engine,
      writeRes2.result.queueId,
      true,
    );

    expect(writeTransactionStatus2.minedAt).toBeDefined();
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
      writeRes.result.queueId,
      true,
    );

    expect(writeTransactionStatus.minedAt).toBeDefined();
  });

  test("Write to a contract with function signature without prefix", async () => {
    const writeRes = await engine.contract.write(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWallet,
      {
        functionName: "setContractURI(string uri)",
        args: ["https://signature-test.com"],
      },
    );

    expect(writeRes.result.queueId).toBeDefined();

    const writeTransactionStatus = await pollTransactionStatus(
      engine,
      writeRes.result.queueId,
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
            outputs: [],
          },
        ],
      },
    );

    expect(writeRes.result.queueId).toBeDefined();

    const writeTransactionStatus = await pollTransactionStatus(
      engine,
      writeRes.result.queueId,
      true,
    );

    expect(writeTransactionStatus.minedAt).toBeDefined();
  });

  test("Write to a contract with non-standard abi", async () => {
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
            // Omitted
            // outputs: [],
          },
        ],
      },
    );

    expect(writeRes.result.queueId).toBeDefined();

    const writeTransactionStatus = await pollTransactionStatus(
      engine,
      writeRes.result.queueId,
      true,
    );

    expect(writeTransactionStatus.minedAt).toBeDefined();
  });

  test("Should throw error if function name is not found", async () => {
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
    } catch (e) {
      expect((e as ApiError).body?.error?.message).toBe(
        `could not find function with name "nonExistentFunction" in abi`,
      );
    }
  });
});
