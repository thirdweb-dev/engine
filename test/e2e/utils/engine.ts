import { getAddress, parseEther, type Address } from "viem";
import { Engine } from "../../../sdk";
import { CONFIG } from "../config";
import { getSlugFromChainName } from "./chain";
import { setupTestClient } from "./viem";

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
        chain: getSlugFromChainName(CONFIG.CHAIN.name),
        chainId: CONFIG.CHAIN.id,
        name: "Anvil",
        nativeCurrency: {
          decimals: 18,
          name: "Anvil Ether",
          symbol: "ETH",
        },
        rpc: [...CONFIG.CHAIN.rpcUrls.default.http],
        slug: "anvil",
      },
    ],
  });

  console.log("Added anvil chain to engine");
};

export const getEngineBackendWallet = async (engine: Engine) => {
  const res = await engine.backendWallet.getAll();
  if (res.result.length === 0) {
    console.log("Creating backend wallet");
    const newWallet = await engine.backendWallet.create({
      label: "Backend Wallet",
    });
    console.log("Created new wallet", newWallet.result.walletAddress);

    return getAddress(newWallet.result.walletAddress);
  }

  console.log("Using existing wallet", res.result[0].address);
  return getAddress(res.result[0].address);
};

export const setWalletBalance = async (
  walletAddress: Address,
  amount: string,
) => {
  const client = setupTestClient();
  await client.setBalance({
    address: walletAddress,
    value: parseEther(amount),
  });
  console.log(`Set balance of ${walletAddress} to ${amount} ETH`);
};
