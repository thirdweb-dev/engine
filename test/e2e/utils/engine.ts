import { checksumAddress } from "thirdweb/utils";
import { Engine } from "../../../sdk";
import { CONFIG } from "../config";
import { ANVIL_PKEY_A, ANVIL_PKEY_B } from "./wallets";

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
    const parsedChains = chains.result;
    if (parsedChains.find((chain) => chain.chainId === CONFIG.CHAIN.id)) {
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
  const { result } = await engine.backendWallet.import({
    label: "Anvil test wallet A",
    privateKey: ANVIL_PKEY_A,
  });
  return checksumAddress(result.walletAddress);
};

export const getEngineBackendWalletB = async (engine: Engine) => {
  const { result } = await engine.backendWallet.import({
    label: "Anvil test wallet B",
    privateKey: ANVIL_PKEY_B,
  });
  return checksumAddress(result.walletAddress);
};
