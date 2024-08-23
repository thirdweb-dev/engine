import { createPublicClient, createTestClient, http } from "viem";
import { foundry } from "viem/chains";
import { CONFIG } from "../config";

export const setupTestClient = () => {
  if (!CONFIG.USE_LOCAL_CHAIN)
    throw new Error("Local chain must be enabled to setup test client");

  return createTestClient({
    chain: foundry,
    mode: "anvil",
    transport: http(),
  });
};

export const setupPublicClient = () => {
  if (CONFIG.USE_LOCAL_CHAIN)
    return createPublicClient({
      chain: foundry,
      transport: http(),
    });

  return createPublicClient({
    chain: CONFIG.CHAIN,
    transport: http(),
  });
};
