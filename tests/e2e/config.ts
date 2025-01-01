import assert from "node:assert";
import { anvil, type Chain } from "thirdweb/chains";

assert(process.env.ENGINE_URL, "ENGINE_URL is required");
assert(process.env.ENGINE_ACCESS_TOKEN, "ENGINE_ACCESS_TOKEN is required");

export const CONFIG: Config = {
  ACCESS_TOKEN: process.env.ENGINE_ACCESS_TOKEN,
  URL: process.env.ENGINE_URL,
  USE_LOCAL_CHAIN: true,
  CHAIN: {
    ...anvil,
    rpc: "http://127.0.0.1:8545/1",
  },
  TRANSACTION_COUNT: 500,
  TRANSACTIONS_PER_BATCH: 100,
  POLLING_INTERVAL: 1000,
  STAGGER_MAX: 500,
};

type Config = {
  ACCESS_TOKEN: string;
  URL: string;
  TRANSACTION_COUNT: number;
  TRANSACTIONS_PER_BATCH: number;
  POLLING_INTERVAL: number;
  STAGGER_MAX: number;
  CHAIN: Chain;
  USE_LOCAL_CHAIN?: boolean;
};
