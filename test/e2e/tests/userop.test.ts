import { beforeAll, describe, expect, test } from "bun:test";
import { type Address, getAddress } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { isContractDeployed } from "thirdweb/utils";
import { DEFAULT_ACCOUNT_FACTORY_V0_6 } from "thirdweb/wallets/smart";
import type { setupEngine } from "../utils/engine";
import { pollTransactionStatus } from "../utils/transactions";
import { client } from "../utils/wallets";
import { setup } from "./setup";

describe("Userop Tests", () => {
  let engine: ReturnType<typeof setupEngine>;
  let backendWallet: Address;
  let accountAddress: Address;

  beforeAll(async () => {
    const { engine: _engine, backendWallet: _backendWallet } = await setup();
    engine = _engine;
    backendWallet = _backendWallet as Address;

    const addr = await engine.accountFactory.predictAccountAddress(
      backendWallet,
      sepolia.id.toString(),
      DEFAULT_ACCOUNT_FACTORY_V0_6,
    );

    const _accountAddress = getAddress(addr.result);

    const isDeployed = await isContractDeployed({
      client,
      chain: sepolia,
      address: _accountAddress,
    });

    if (!isDeployed) {
      const res = await engine.accountFactory.createAccount(
        sepolia.id.toString(),
        DEFAULT_ACCOUNT_FACTORY_V0_6,
        backendWallet,
        {
          adminAddress: backendWallet,
        },
      );

      if (!res.result.deployedAddress) {
        throw new Error("Account address not found");
      }
    }

    accountAddress = _accountAddress;
  });

  test("Should send a nft claim userop", async () => {
    const writeRes = await engine.erc1155.erc1155ClaimTo(
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
      DEFAULT_ACCOUNT_FACTORY_V0_6,
    );

    expect(writeRes.result.queueId).toBeDefined();

    const writeTransactionStatus = await pollTransactionStatus(
      engine,
      writeRes.result.queueId,
      true,
    );

    expect(writeTransactionStatus.minedAt).toBeDefined();
  });
});
