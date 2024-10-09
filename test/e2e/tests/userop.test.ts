import { beforeAll, describe, expect, test } from "bun:test";
import { type Address, getAddress } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import type { setupEngine } from "../utils/engine";
import { pollTransactionStatus } from "../utils/transactions";
import { setup } from "./setup";

describe("Userop Tests", () => {
  let engine: ReturnType<typeof setupEngine>;
  let backendWallet: Address;
  let accountAddress: Address;

  const accountFactoryAddress = "0xD8a284BdF6fda948ac684ba72445e65e1f7b982A";

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
});
