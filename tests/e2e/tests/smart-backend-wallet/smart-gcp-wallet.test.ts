import { describe, expect, test } from "bun:test";
import { ZERO_ADDRESS } from "thirdweb";
import { arbitrumSepolia } from "thirdweb/chains";
import { pollTransactionStatus } from "../../utils/transactions";
import { setup } from "../setup";

const chain = arbitrumSepolia.id.toString();

describe("smart gcp-kms wallet", () => {
  let smartWalletAddress: string | undefined;
  let tokenAddress: string | undefined;

  const getSmartWalletAddress = () => {
    if (!smartWalletAddress) {
      throw new Error("Smart wallet address not set");
    }
    return smartWalletAddress;
  };

  const getTokenAddress = () => {
    if (!tokenAddress) {
      throw new Error("Token address not set");
    }
    return tokenAddress;
  };

  test("Create a gcp-kms smart backend wallet", async () => {
    const { engine } = await setup();

    const res = await engine.backendWallet.create({
      type: "smart:gcp-kms",
      label: "test",
    });

    expect(res.result.status).toEqual("success");
    expect(res.result.type).toEqual("smart:gcp-kms");
    expect(res.result.walletAddress).toBeDefined();

    smartWalletAddress = res.result.walletAddress;
  });

  test("Send a SDK v5 Transaction (sendTransaction noop)", async () => {
    const { engine } = await setup();
    const res = await engine.backendWallet.sendTransaction(
      chain,
      getSmartWalletAddress(),
      {
        data: "0x",
        value: "0",
        toAddress: ZERO_ADDRESS,
      },
    );

    await pollTransactionStatus(engine, res.result.queueId);

    const status = await engine.transaction.status(res.result.queueId);
    expect(status.result.accountAddress).toEqual(getSmartWalletAddress());
    expect(status.result.status).toEqual("mined");
  });

  test("Send a SDK v4 Transaction (deploy ERC20)", async () => {
    const { engine } = await setup();

    const deployRes = await engine.deploy.deployToken(
      chain,
      getSmartWalletAddress(),
      {
        contractMetadata: {
          name: "Test",
          symbol: "TST",
          platform_fee_basis_points: 0,
          platform_fee_recipient: getSmartWalletAddress(),
          trusted_forwarders: [],
        },
      },
    );

    const { queueId: deployQueueId, deployedAddress } = deployRes.result;

    if (!deployedAddress || !deployQueueId) {
      throw new Error("Deploy failed");
    }

    tokenAddress = deployedAddress;
    await pollTransactionStatus(engine, deployQueueId);

    const mintRes = await engine.erc20.mintTo(
      chain,
      deployedAddress,
      getSmartWalletAddress(),
      {
        amount: "1000",
        toAddress: getSmartWalletAddress(),
      },
    );

    await pollTransactionStatus(engine, mintRes.result.queueId);
    const status = await engine.transaction.status(mintRes.result.queueId);
    expect(status.result.accountAddress).toEqual(getSmartWalletAddress());

    const balance = await engine.erc20.balanceOf(
      getSmartWalletAddress(),
      chain,
      deployedAddress,
    );

    expect(Number(balance.result.displayValue)).toEqual(1000);
  });

  test("Send a SDK v5 Transaction (transfer ERC20)", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.erc20.transfer(
      chain,
      getTokenAddress(),
      getSmartWalletAddress(),
      {
        amount: "100",
        toAddress: backendWallet,
      },
    );

    await pollTransactionStatus(engine, res.result.queueId);
    const status = await engine.transaction.status(res.result.queueId);
    expect(status.result.accountAddress).toEqual(getSmartWalletAddress());

    const smartWalletBalance = await engine.erc20.balanceOf(
      getSmartWalletAddress(),
      chain,
      getTokenAddress(),
    );

    const backendWalletBalance = await engine.erc20.balanceOf(
      backendWallet,
      chain,
      getTokenAddress(),
    );

    expect(Number(smartWalletBalance.result.displayValue)).toEqual(900);
    expect(Number(backendWalletBalance.result.displayValue)).toEqual(100);
  });

  test("Delete gcp-kms smart backend wallet", async () => {
    const { engine } = await setup();

    const res = await engine.backendWallet.removeBackendWallet(
      getSmartWalletAddress(),
    );
    expect(res.result.status).toEqual("success");
  });
});
