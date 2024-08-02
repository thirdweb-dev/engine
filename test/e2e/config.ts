import assert from "assert";
import { defineChain, type Chain } from "viem";

assert(process.env.ENGINE_URL, "ENGINE_URL is required");
assert(process.env.ENGINE_ACCESS_TOKEN, "ENGINE_ACCESS_TOKEN is required");

export const CONFIG: Config = {
  ACCESS_TOKEN: process.env.ENGINE_ACCESS_TOKEN,
  URL: process.env.ENGINE_URL,

  // CHAIN_ID: 1993,
  // CHAIN_NAME: "anvil",
  // RPC_URL: "http://localhost:8545",
  // RPC_URL: "http://localhost:8545",
  // USE_LOCAL_CHAIN: true,
  // CHAIN: arbitrumSepolia,

  USE_LOCAL_CHAIN: false,
  CHAIN: defineChain({
    id: 1993,
    name: "B3 Sepolia Testnet",
    testnet: true,
    rpcUrls: {
      default: {
        http: ["https://sepolia.b3.fun/http"],
        webSocket: ["wss://sepolia.b3.fun/ws"],
      },
    },
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
  }),

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
