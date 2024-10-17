import { beforeAll, describe, expect, test } from "bun:test";
import assert from "node:assert";
import { ZERO_ADDRESS, toWei, type Address } from "thirdweb";
import { CONFIG } from "../../config";
import { getEngineBackendWalletB, type setupEngine } from "../../utils/engine";
import { pollTransactionStatus } from "../../utils/transactions";
import { setup } from "./../setup";

describe("ERC20 transfer", () => {
  let tokenContractAddress: string;
  let engine: ReturnType<typeof setupEngine>;
  let backendWalletA: Address;
  let backendWalletB: Address;

  beforeAll(async () => {
    const setupRes = await setup();
    engine = setupRes.engine;
    backendWalletA = setupRes.backendWallet;
    backendWalletB = await getEngineBackendWalletB(engine);

    const deployRes = await engine.deploy.deployToken(
      CONFIG.CHAIN.id.toString(),
      backendWalletA,
      {
        contractMetadata: {
          name: "test token",
          platform_fee_basis_points: 0,
          platform_fee_recipient: ZERO_ADDRESS,
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

    const mintToResA = await engine.erc20.mintTo(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        toAddress: backendWalletA,
        amount: "10",
      },
    );
    console.log("Waiting: minting tokens...");
    await pollTransactionStatus(engine, mintToResA.result.queueId, false);

    const mintToResB = await engine.erc20.mintTo(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        toAddress: backendWalletB,
        amount: "10",
      },
    );
    console.log("Waiting: minting tokens...");
    await pollTransactionStatus(engine, mintToResB.result.queueId, false);
  });

  const getBalance = async (walletAddress: Address) => {
    const balanceOfRes = await engine.erc20.balanceOf(
      walletAddress,
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
    );
    return balanceOfRes.result.value;
  };

  test("Calling transfer succeeds", async () => {
    const balanceStart = await getBalance(backendWalletA);

    const transferRes = await engine.erc20.transfer(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        toAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        amount: "2.5",
      },
    );
    console.log("Waiting: transferring token...");
    await pollTransactionStatus(engine, transferRes.result.queueId, false);

    const balanceEnd = await getBalance(backendWalletA);
    expect(BigInt(balanceStart) - BigInt(balanceEnd)).toEqual(toWei("2.5"));
  });

  test("Calling transferFrom succeeds after allowance", async () => {
    const setAllowanceRes = await engine.erc20.setAllowance(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletB,
      {
        spenderAddress: backendWalletA,
        amount: "2.5",
      },
    );
    await pollTransactionStatus(engine, setAllowanceRes.result.queueId, false);

    const balanceStart = await getBalance(backendWalletB);
    const transferFromRes = await engine.erc20.transferFrom(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        fromAddress: backendWalletB,
        toAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        amount: "2.5",
      },
    );
    console.log("Waiting: transferring token...");
    await pollTransactionStatus(engine, transferFromRes.result.queueId, false);

    const balanceEnd = await getBalance(backendWalletB);
    expect(BigInt(balanceStart) - BigInt(balanceEnd)).toEqual(toWei("2.5"));
  });

  test("Calling transferFrom fails without allowance", async () => {
    const balanceStart = await getBalance(backendWalletB);
    // Expected to fail.
    const transferFromRes = await engine.erc20.transferFrom(
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
      backendWalletA,
      {
        fromAddress: backendWalletB,
        toAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        amount: "2.5",
      },
    );
    console.log("Waiting: transferring token...");
    await pollTransactionStatus(engine, transferFromRes.result.queueId, false);

    const balanceEnd = await getBalance(backendWalletB);
    expect(BigInt(balanceStart) - BigInt(balanceEnd)).toEqual(0n);
  });
});
