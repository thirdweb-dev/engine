import { defineChain } from "thirdweb";
import { anvil } from "thirdweb/chains";
import { createTestClient, http } from "viem";

export const ANVIL_CHAIN = defineChain({
  ...anvil,
  rpc: "http://127.0.0.1:8645/1",
});

export const anvilTestClient = createTestClient({
  mode: "anvil",
  transport: http(ANVIL_CHAIN.rpc),
});
