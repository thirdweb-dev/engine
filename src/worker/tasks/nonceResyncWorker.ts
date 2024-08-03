import { Job, Processor, Worker } from "bullmq";
import { eth_getTransactionCount, getRpcClient } from "thirdweb";
import {
  lastUsedNonceKey,
  recycleNonce,
  recycledNoncesKey,
} from "../../db/wallets/walletNonce";
import { getConfig } from "../../utils/cache/getConfig";
import { getChain } from "../../utils/chain";
import { normalizeAddress } from "../../utils/primitiveTypes";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import { NonceResyncQueue } from "../queues/nonceResyncQueue";
import { logWorkerExceptions } from "../queues/queues";

// Must be explicitly called for the worker to run on this host.
export const initNonceResyncWorker = async () => {
  const config = await getConfig();
  if (config.minedTxListenerCronSchedule) {
    console.log(
      "::Debug Log:: inside nonceResyncWorker.ts, initNonceResyncWorker()",
      config.minedTxListenerCronSchedule,
    );

    NonceResyncQueue.q.add("cron", "", {
      repeat: { pattern: config.minedTxListenerCronSchedule },
      jobId: "nonce-resync-cron",
    });
  }

  const _worker = new Worker(NonceResyncQueue.q.name, handler, {
    connection: redis,
    concurrency: 1,
  });
  logWorkerExceptions(_worker);
};

export const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms, null));

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const sentnonceKeys = await redis.keys("*sentnonce*");
  job.log(`Found ${sentnonceKeys.length} sentnonce keys`);

  for (const sentNonceKey of sentnonceKeys) {
    const _splittedKeys = sentNonceKey.split(":");
    const walletAddress = normalizeAddress(_splittedKeys[1]);
    const chainId = parseInt(_splittedKeys[2]);
    // Check blockchain for nonce
    const rpcRequest = getRpcClient({
      client: thirdwebClient,
      chain: await getChain(chainId),
    });

    // The next unused nonce = transactionCount.
    const transactionCount = await eth_getTransactionCount(rpcRequest, {
      address: walletAddress,
    });

    // Get Pending Nonce
    const dbNonceCount = Number(
      await redis.get(lastUsedNonceKey(chainId, walletAddress)),
    );
    job.log(`onchain Nonce: ${transactionCount} and DBNonce: ${dbNonceCount}`);
    console.log(
      `onchain Nonce: ${transactionCount} and DBNonce: ${dbNonceCount}`,
    );

    if (dbNonceCount < transactionCount - 1) {
      const difference = transactionCount - dbNonceCount - 1;
      for (let i = 0; i < difference; i++) {
        const nonce = dbNonceCount + i + 1;
        await recycleNonce(chainId, walletAddress, nonce);
      }
    }

    for (let _nonce = transactionCount; _nonce < dbNonceCount; _nonce++) {
      if (isNaN(_nonce)) {
        continue;
      }
      console.log(
        "::Debug Log:: NonceResyncWorker.ts, handler() - _nonce: ",
        _nonce,
      );

      const exists = await redis.sismember(sentNonceKey, _nonce.toString());
      console.log(
        "::Debug Log:: NonceResyncWorker.ts, handler() - exists: ",
        exists,
      );
      if (!exists) {
        const existsInRecycleNonce = await redis.lpos(
          recycledNoncesKey(chainId, walletAddress),
          _nonce.toString(),
        );
        console.log(
          "::Debug Log:: Position of nonce in recycle list:",
          existsInRecycleNonce,
        );

        if (!existsInRecycleNonce) {
          console.log(
            "::Debug Log:: NonceResyncWorker.ts, handler() - existsInRecycleNonce: ",
            existsInRecycleNonce,
          );

          job.log(`Recycle nonce ${_nonce}`);
          // recycle nonce
          await recycleNonce(chainId, walletAddress, _nonce);
        } else {
          console.log(`::Debug Log:: Nonce ${_nonce} already in recycle list`);
        }
      }
    }
  }
};
