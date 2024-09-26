import { getAddress } from "viem";
import { Engine } from "../../../sdk";
import { CONFIG } from "../config";
import { ANVIL_PKEY_A, TEST_ACCOUNT_A } from "./wallets";

export const setupEngine = () => {
  return new Engine({
    accessToken: CONFIG.ACCESS_TOKEN,
    url: CONFIG.URL,
  });
};

export const createChain = async (engine: Engine) => {
  if (!CONFIG.USE_LOCAL_CHAIN) return;

  const chains = await engine.configuration.getChainsConfiguration();

  if (chains.result) {
    const parsedChains = JSON.parse(chains.result);
    if (parsedChains.find((chain: any) => chain.chainId === CONFIG.CHAIN.id)) {
      console.log("Anvil chain already exists in engine");
      return;
    }
  }

  await engine.configuration.updateChainsConfiguration({
    chainOverrides: [
      {
        chain: CONFIG.CHAIN.name || "Anvil",
        chainId: CONFIG.CHAIN.id,
        name: "Anvil",
        nativeCurrency: {
          decimals: 18,
          name: "Anvil Ether",
          symbol: "ETH",
        },
        rpc: [CONFIG.CHAIN.rpc],
        slug: "anvil",
      },
    ],
  });

  console.log("Added anvil chain to engine");
};

export const getEngineBackendWallet = async (engine: Engine) => {
  const res = await engine.backendWallet.getAll();
  if (
    !res.result.find((r) => r.address.toLowerCase() === TEST_ACCOUNT_A.address)
  ) {
    console.log("Creating backend wallet");
    const newWallet = await engine.backendWallet.import({
      privateKey: ANVIL_PKEY_A,
    });
    console.log("Created new wallet", newWallet.result.walletAddress);

    return getAddress(newWallet.result.walletAddress);
  }

  console.log("Using existing wallet", res.result[0].address);
  return getAddress(res.result[0].address);
};
