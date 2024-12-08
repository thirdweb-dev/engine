import { beforeAll, describe, expect, test } from "bun:test";
import assert from "node:assert";
import { ZERO_ADDRESS, type Address } from "thirdweb";
import { CONFIG } from "../../config";
import { getEngineBackendWalletB, type setupEngine } from "../../utils/engine";
import { pollTransactionStatus } from "../../utils/transactions";
import { setup } from "../setup";

describe("ER1155 transfer", () => {
  let tokenContractAddress: string;
  let engine: ReturnType<typeof setupEngine>;
  let backendWalletA: Address;
  let backendWalletB: Address;

  beforeAll(async () => {
    const setupRes = await setup();
    engine = setupRes.engine;
    backendWalletA = setupRes.backendWallet;
    backendWalletB = await getEngineBackendWalletB(engine);

    const deployRes = await engine.deploy.deployEdition(
      CONFIG.CHAIN.id.toString(),
      backendWalletA,
      {
        contractMetadata: {
          name: "test token",
          platform_fee_basis_points: 0,
          platform_fee_recipient: ZERO_ADDRESS,
          seller_fee_basis_points: 0,
          fee_recipient: ZERO_ADDRESS,
          symbol: "TT",
          trusted_forwarders: [],
        },
      },
    );
    assert(deployRes.result.queueId);
    console.log("Waiting: deploying contract...");
    await pollTransactionStatus(engine, deployRes.result.queueId, false);

    assert(deployRes.result.deployedAddress, "deployedAddress must be defined");
    tokenContractAddress = deployRes.result.deployedAddress;

    const mintToRes0 = await engine.erc1155.mintTo(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        receiver: backendWalletA,
        metadataWithSupply: {
          metadata: "ipfs://test",
          supply: "10",
        },
      },
    );
    console.log("Waiting: minting token ID 0...");
    await pollTransactionStatus(engine, mintToRes0.result.queueId, false);

    const mintToRes1 = await engine.erc1155.mintTo(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        receiver: backendWalletB,
        metadataWithSupply: {
          metadata: "ipfs://test",
          supply: "10",
        },
      },
    );
    console.log("Waiting: minting token ID 1...");
    await pollTransactionStatus(engine, mintToRes1.result.queueId, false);
  });

  const getBalance = async (walletAddress: Address, tokenId: string) => {
    const balanceOfRes = await engine.erc1155.balanceOf(
      walletAddress,
      tokenId,
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
    );
    return balanceOfRes.result ? BigInt(balanceOfRes.result) : 0n;
  };

  test("Calling transfer succeeds", async () => {
    const balanceStart = await getBalance(backendWalletA, "0");

    const transferRes = await engine.erc1155.transfer(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        to: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        tokenId: "0",
        amount: "1",
        data: "0xabc",
      },
    );
    console.log("Waiting: transferring token...");
    await pollTransactionStatus(engine, transferRes.result.queueId, false);

    const balanceEnd = await getBalance(backendWalletA, "0");
    expect(balanceStart - balanceEnd).toEqual(1n);
  });

  test("Calling transferFrom succeds after allowance", async () => {
    let balanceStart = await getBalance(backendWalletB, "1");
    // Expected to fail.
    const transferFromRes = await engine.erc1155.transferFrom(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        from: backendWalletB,
        to: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        tokenId: "1",
        amount: "1",
        data: "0xabc",
      },
    );
    console.log("Waiting: transferring token...");
    await pollTransactionStatus(engine, transferFromRes.result.queueId, false);

    let balanceEnd = await getBalance(backendWalletB, "1");
    expect(balanceStart - balanceEnd).toEqual(0n);

    const setAllowanceRes = await engine.erc1155.setApprovalForAll(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletB,
      {
        operator: backendWalletA,
        approved: true,
      },
    );
    await pollTransactionStatus(engine, setAllowanceRes.result.queueId, false);

    balanceStart = await getBalance(backendWalletB, "1");
    const transferFromRes2 = await engine.erc1155.transferFrom(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        from: backendWalletB,
        to: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        tokenId: "1",
        amount: "1",
        data: "0xabc",
      },
    );
    console.log("Waiting: transferring token...");
    await pollTransactionStatus(engine, transferFromRes2.result.queueId, false);

    balanceEnd = await getBalance(backendWalletB, "1");
    expect(balanceStart - balanceEnd).toEqual(1n);
  });
});
