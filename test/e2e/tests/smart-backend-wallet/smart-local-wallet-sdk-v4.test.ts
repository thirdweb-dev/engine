import { describe, expect, test } from "bun:test";
import { arbitrumSepolia } from "thirdweb/chains";
import { pollTransactionStatus } from "../../utils/transactions";
import { setup } from "../setup";

const chain = arbitrumSepolia;
const chainId = chain.id.toString();

describe("smart local wallet (test succesfull deploy with SDKv4)", () => {
  let smartWalletAddress: string | undefined;

  const getSmartWalletAddress = () => {
    if (!smartWalletAddress) {
      throw new Error("Smart wallet address not set");
    }
    return smartWalletAddress;
  };

  test("Create a local smart backend wallet", async () => {
    const { engine } = await setup();

    const res = await engine.backendWallet.create({
      type: "smart:local",
      label: "test",
    });

    expect(res.result.status).toEqual("success");
    expect(res.result.type).toEqual("smart:local");
    expect(res.result.walletAddress).toBeDefined();

    smartWalletAddress = res.result.walletAddress;
  });

  test("Send a SDK v4 Transaction (deploy ERC20)", async () => {
    const { engine } = await setup();

    const deployRes = await engine.deploy.deployToken(
      chainId,
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

    await pollTransactionStatus(engine, deployQueueId);

    const mintRes = await engine.erc20.mintTo(
      chainId,
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
      chainId,
      deployedAddress,
    );

    expect(Number(balance.result.displayValue)).toEqual(1000);
  });

  test("Delete local smart backend wallet", async () => {
    const { engine } = await setup();

    const res = await engine.backendWallet.removeBackendWallet(
      getSmartWalletAddress(),
    );
    expect(res.result.status).toEqual("success");
  });
});
