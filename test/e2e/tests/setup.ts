import { env, sleep } from "bun";
import { afterAll, beforeAll } from "bun:test";
import {
  createChain,
  getEngineBackendWallet,
  setupEngine,
} from "../utils/engine";

import { createThirdwebClient, type Address } from "thirdweb";
import { CONFIG } from "../config";
import { startAnvil, stopAnvil } from "../utils/anvil";

type SetupResult = {
  engine: ReturnType<typeof setupEngine>;
  backendWallet: Address;
  thirdwebClient: ReturnType<typeof createThirdwebClient>;
};

let cachedSetup: SetupResult | null = null;

export const setup = async (): Promise<SetupResult> => {
  if (cachedSetup) {
    return cachedSetup;
  }

  const engine = setupEngine();
  const backendWallet = await getEngineBackendWallet(engine);
  await engine.backendWallet.resetNonces();

  if (!env.THIRDWEB_API_SECRET_KEY)
    throw new Error("THIRDWEB_API_SECRET_KEY is not set");

  const thirdwebClient = createThirdwebClient({
    secretKey: env.THIRDWEB_API_SECRET_KEY,
  });

  if (CONFIG.USE_LOCAL_CHAIN) {
    startAnvil();

    await createChain(engine);
    await sleep(1000); // wait for chain to start producing blocks
  }

  cachedSetup = { engine, backendWallet, thirdwebClient };
  return cachedSetup;
};

// Run setup once before all tests
beforeAll(async () => {
  await setup();
});

afterAll(async () => {
  await stopAnvil();
});
