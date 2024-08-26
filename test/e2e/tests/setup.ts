import { sleep } from "bun";
import { beforeAll } from "bun:test";
import { createChain, setWalletBalance, setupEngine } from "../utils/engine";

import type { Address } from "viem";
import { CONFIG } from "../config";
import { setupAnvil } from "../utils/anvil";
import { setupPublicClient, setupTestClient } from "../utils/viem";

type SetupResult = {
  testClient?: ReturnType<typeof setupTestClient>;
  publicClient: ReturnType<typeof setupPublicClient>;
  engine: ReturnType<typeof setupEngine>;
  backendWallet: Address;
};

let cachedSetup: SetupResult | null = null;

export const setup = async (): Promise<SetupResult> => {
  if (cachedSetup) {
    return cachedSetup;
  }

  const publicClient = setupPublicClient();
  const engine = setupEngine();
  // const backendWallet = await getEngineBackendWallet(engine);
  const backendWallet = "0x50495dacda9553e50dad15cd3a3016743f71b4c9";
  let testClient;

  if (CONFIG.USE_LOCAL_CHAIN) {
    setupAnvil();

    testClient = setupTestClient();
    await createChain(engine);
    await setWalletBalance(backendWallet, CONFIG.INITIAL_BALANCE);
    await sleep(1000); // wait for chain to start producing blocks
  }

  cachedSetup = { testClient, publicClient, engine, backendWallet };
  return cachedSetup;
};

// Run setup once before all tests
beforeAll(async () => {
  await setup();
});
