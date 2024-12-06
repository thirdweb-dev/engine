import assert from "node:assert";
import { sleep } from "bun";
import { beforeAll, describe, expect, test } from "bun:test";
import { getAddress, type Address } from "viem";
import { CONFIG } from "../config";
import type { setupEngine } from "../utils/engine";
import { setup } from "./setup";

describe("Extensions", () => {
  let nftContractAddress: Address | undefined;
  let engine: ReturnType<typeof setupEngine>;
  let backendWallet: Address;

  beforeAll(async () => {
    const setupRes = await setup();
    engine = setupRes.engine;
    backendWallet = setupRes.backendWallet;

    const res = await engine.deploy.deployNftCollection(
      CONFIG.CHAIN.id.toString(),
      backendWallet,
      {
        contractMetadata: {
          name: "Test NFT",
          symbol: "TNFT",
          fee_recipient: backendWallet,
          platform_fee_basis_points: 0,
          platform_fee_recipient: backendWallet,
          seller_fee_basis_points: 0,
          trusted_forwarders: [],
        },
      },
    );

    nftContractAddress = res.result.deployedAddress
      ? getAddress(res.result.deployedAddress)
      : undefined;

    let mined = false;

    while (!mined) {
      const statusRes = await engine.transaction.status(res.result.queueId!);
      mined = statusRes.result.status === "mined";
      await sleep(1000);
    }

    expect(nftContractAddress).toBeDefined();
    console.log("NFT Contract Address:", nftContractAddress);
  });

  test("Mint NFT", async () => {
    expect(nftContractAddress).toBeDefined();
    assert(nftContractAddress, "NFT contract address is not defined");

    const res = await engine.erc721.mintTo(
      CONFIG.CHAIN.id.toString(),
      nftContractAddress,
      backendWallet,
      {
        receiver: backendWallet,
        metadata: {
          name: "My NFT",
          description: "My NFT description",
          image:
            "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
        },
      },
    );

    expect(res.result.queueId).toBeDefined();

    let mined = false;
    while (!mined) {
      const status = await engine.transaction.status(res.result.queueId!);
      mined = !!status.result.minedAt;
      await sleep(1000);
    }

    const engineBalanceOfBackendWallet = await engine.erc721.balanceOf(
      backendWallet,
      CONFIG.CHAIN.id.toString(),
      nftContractAddress,
    );

    expect(engineBalanceOfBackendWallet.result).toEqual("1");
  });
});
