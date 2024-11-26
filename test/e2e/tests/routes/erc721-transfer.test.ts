import { beforeAll, describe, expect, test } from "bun:test";
import assert from "node:assert";
import { type Address, ZERO_ADDRESS } from "thirdweb";
import { CONFIG } from "../../config";
import { getEngineBackendWalletB, type setupEngine } from "../../utils/engine";
import { pollTransactionStatus } from "../../utils/transactions";
import { setup } from "../setup";

describe("ERC721 transfer", () => {
  let tokenContractAddress: string;
  let engine: ReturnType<typeof setupEngine>;
  let backendWalletA: Address;
  let backendWalletB: Address;

  beforeAll(async () => {
    const setupRes = await setup();
    engine = setupRes.engine;
    backendWalletA = setupRes.backendWallet;
    backendWalletB = await getEngineBackendWalletB(engine);

    const deployRes = await engine.deploy.deployNftCollection(
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
  });

  const getBalance = async (walletAddress: Address) => {
    const balanceOfRes = await engine.erc721.balanceOf(
      walletAddress,
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
    );
    return balanceOfRes.result ? BigInt(balanceOfRes.result) : 0n;
  };

  test("Calling transfer succeeds", async () => {
    const mintToRes = await engine.erc721.mintTo(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        receiver: backendWalletA,
        metadata: "ipfs://test",
      },
    );
    console.log("Waiting: minting tokens...");
    await pollTransactionStatus(engine, mintToRes.result.queueId, false);

    const balanceStart = await getBalance(backendWalletA);
    const transferRes = await engine.erc721.transfer(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        to: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        tokenId: "0",
      },
    );
    console.log("Waiting: transferring token...");
    await pollTransactionStatus(engine, transferRes.result.queueId, false);

    const balanceEnd = await getBalance(backendWalletA);
    expect(balanceStart - balanceEnd).toEqual(1n);
  });

  test("Calling transferFrom succeeds after allowance", async () => {
    const mintToRes = await engine.erc721.mintTo(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        receiver: backendWalletB,
        metadata: "ipfs://test",
      },
    );
    console.log("Waiting: minting tokens...");
    await pollTransactionStatus(engine, mintToRes.result.queueId, false);

    const balanceStart = await getBalance(backendWalletB);
    const setAllowanceRes = await engine.erc721.setApprovalForToken(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletB,
      {
        operator: backendWalletA,
        tokenId: "1",
      },
    );
    await pollTransactionStatus(engine, setAllowanceRes.result.queueId, false);

    const transferFromRes = await engine.erc721.transferFrom(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        from: backendWalletB,
        to: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        tokenId: "1",
      },
    );
    console.log("Waiting: transferring token...");
    await pollTransactionStatus(engine, transferFromRes.result.queueId, false);

    const balanceEnd = await getBalance(backendWalletB);
    expect(balanceStart - balanceEnd).toEqual(1n);
  });

  test("Calling transferFrom fails without allowance", async () => {
    const mintToRes = await engine.erc721.mintTo(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        receiver: backendWalletB,
        metadata: "ipfs://test",
      },
    );
    console.log("Waiting: minting tokens...");
    await pollTransactionStatus(engine, mintToRes.result.queueId, false);

    // Expected to fail.
    const balanceStart = await getBalance(backendWalletB);
    const transferFromRes = await engine.erc721.transferFrom(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        from: backendWalletB,
        to: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        tokenId: "2",
      },
    );
    console.log("Waiting: transferring token...");
    await pollTransactionStatus(engine, transferFromRes.result.queueId, false);

    const balanceEnd = await getBalance(backendWalletB);
    expect(balanceStart - balanceEnd).toEqual(0n);
  });
});
