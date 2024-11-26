import { sleep } from "bun";
import type { Address } from "viem";
import type { Engine } from "../../../sdk";
import { CONFIG } from "../config";

type Timing = {
  queuedAt?: number;
  sentAt?: number;
  minedAt?: number;
  errorMessage?: string;
};

export const sendNoOpTransaction = async (
  engine: Engine,
  backendWallet: Address,
) => {
  try {
    const {
      result: { queueId },
    } = await engine.backendWallet.transfer(
      CONFIG.CHAIN.id.toString(),
      backendWallet,
      {
        amount: "0",
        currencyAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        to: backendWallet,
      },
    );
    return queueId;
  } catch (e) {
    console.error("Error sending NoOp transaction:", e);
    return undefined;
  }
};

export const sendMintToTransaction = async (
  engine: Engine,
  nftContractAddress: Address,
  backendWallet: Address,
) => {
  try {
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
    return res.result.queueId;
  } catch (e) {
    console.error("Error sending MintTo transaction:", e);
    return undefined;
  }
};

export const pollTransactionStatus = async (
  engine: Engine,
  queueId: string,
  log = false,
) => {
  let mined = false;
  const timing: Timing = {};

  while (!mined) {
    await sleep(Math.random() * CONFIG.STAGGER_MAX);
    const res = await engine.transaction.status(queueId);
    // stagger some sleep

    if (log) {
      console.log("Transaction status:", res.result.status);
    }

    if (res.result.errorMessage) {
      console.error("Transaction Error:", res.result.errorMessage);
      timing.errorMessage = res.result.errorMessage;
      return timing;
    }

    if (res.result.minedAt) {
      timing.minedAt = new Date(res.result.minedAt).getTime();
      mined = true;
    }

    if (res.result.sentAt) {
      timing.sentAt = new Date(res.result.sentAt).getTime();
    }

    if (res.result.queuedAt) {
      timing.queuedAt = new Date(res.result.queuedAt).getTime();
    }

    if (res.result.status === "errored") {
      console.error("Transaction errored:", res.result.errorMessage);
      timing.errorMessage = res.result.errorMessage ?? undefined;
      return timing;
    }

    if (!mined) {
      await sleep(CONFIG.POLLING_INTERVAL);
    }
  }

  return timing;
};
