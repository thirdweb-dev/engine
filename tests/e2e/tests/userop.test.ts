import { beforeAll, describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { getAddress, type Address } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { DEFAULT_ACCOUNT_FACTORY_V0_6 } from "thirdweb/wallets/smart";
import type { ApiError } from "../../../sdk/dist/declarations/src/core/ApiError";
import type { setupEngine } from "../utils/engine";
import { pollTransactionStatus } from "../utils/transactions";
import { setup } from "./setup";

describe("Userop Tests", () => {
  let engine: ReturnType<typeof setupEngine>;
  let backendWallet: Address;
  let accountAddress: Address;

  const accountFactoryAddress = DEFAULT_ACCOUNT_FACTORY_V0_6;

  beforeAll(async () => {
    const { engine: _engine, backendWallet: _backendWallet } = await setup();
    engine = _engine;
    backendWallet = _backendWallet as Address;

    const addr = await engine.accountFactory.predictAccountAddress(
      backendWallet,
      sepolia.id.toString(),
      accountFactoryAddress,
    );

    accountAddress = getAddress(addr.result);
  });

  test("Should send a nft claim userop", async () => {
    const writeRes = await engine.erc1155.claimTo(
      sepolia.id.toString(),
      "0xe2cb0eb5147b42095c2FfA6F7ec953bb0bE347D8",
      backendWallet,
      {
        quantity: "1",
        receiver: accountAddress,
        tokenId: "0",
      },
      false,
      undefined,
      accountAddress,
      accountFactoryAddress,
    );

    expect(writeRes.result.queueId).toBeDefined();

    const writeTransactionStatus = await pollTransactionStatus(
      engine,
      writeRes.result.queueId,
      true,
    );

    expect(writeTransactionStatus.minedAt).toBeDefined();
  });

  test("Should send a nft claim userop with undeployed account with salt", async () => {
    const accountSalt = `user-${randomBytes(32).toString("hex")}`;
    const predictedAddress = await engine.accountFactory.predictAccountAddress(
      backendWallet,
      sepolia.id.toString(),
      accountFactoryAddress,
      accountSalt,
    );

    const userAddress = getAddress(predictedAddress.result);
    console.log("userAddress", userAddress);

    const writeRes = await engine.erc1155.claimTo(
      sepolia.id.toString(),
      "0xe2cb0eb5147b42095c2FfA6F7ec953bb0bE347D8",
      backendWallet,
      {
        quantity: "1",
        receiver: userAddress,
        tokenId: "0",
      },
      false,
      undefined,
      userAddress,
      accountFactoryAddress,
      accountSalt,
    );

    expect(writeRes.result.queueId).toBeDefined();

    const writeTransactionStatus = await pollTransactionStatus(
      engine,
      writeRes.result.queueId,
      true,
    );

    expect(writeTransactionStatus.minedAt).toBeDefined();
  });

  test("Should throw decoded error with simulate false", async () => {
    const res = await engine.contractRoles.grant(
      sepolia.id.toString(),
      "0xe2cb0eb5147b42095c2FfA6F7ec953bb0bE347D8",
      backendWallet,
      {
        address: accountAddress,
        role: "minter",
      },
      false,
      undefined,
      accountAddress,
      accountFactoryAddress,
    );

    expect(res.result.queueId).toBeDefined();

    const writeTransactionStatus = await pollTransactionStatus(
      engine,
      res.result.queueId,
      true,
    );

    expect(writeTransactionStatus.errorMessage).toBe(
      `Error - Permissions: account ${accountAddress.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`,
    );
  });

  test("Should throw decoded error with simulate true", async () => {
    try {
      await engine.contractRoles.grant(
        sepolia.id.toString(),
        "0xe2cb0eb5147b42095c2FfA6F7ec953bb0bE347D8",
        backendWallet,
        {
          address: accountAddress,
          role: "minter",
        },
        true,
        undefined,
        accountAddress,
        accountFactoryAddress,
      );
    } catch (e) {
      expect((e as ApiError).body?.error?.message).toBe(
        `Simulation failed: TransactionError: Error - Permissions: account ${accountAddress.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`,
      );
    }
  });
});
