import assert from "assert";
import { type Chain } from "viem";
import { anvil } from "viem/chains";

assert(process.env.ENGINE_URL, "ENGINE_URL is required");
assert(process.env.ENGINE_ACCESS_TOKEN, "ENGINE_ACCESS_TOKEN is required");

export const CONFIG: Config = {
  ACCESS_TOKEN: process.env.ENGINE_ACCESS_TOKEN,
  URL: process.env.ENGINE_URL,

  USE_LOCAL_CHAIN: true,
  CHAIN: anvil,

  TRANSACTION_COUNT: 500,
  TRANSACTIONS_PER_BATCH: 100,
  POLLING_INTERVAL: 1000,

  STAGGER_MAX: 500,
  INITIAL_BALANCE: "10000", // in Ether
};

type Config = {
  ACCESS_TOKEN: string;
  URL: string;
  TRANSACTION_COUNT: number;
  TRANSACTIONS_PER_BATCH: number;
  POLLING_INTERVAL: number;
  STAGGER_MAX: number;
  INITIAL_BALANCE: string;

  CHAIN: Chain;
  USE_LOCAL_CHAIN?: boolean;
};
