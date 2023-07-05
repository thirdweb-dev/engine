import { LocalWallet } from "@thirdweb-dev/wallets";
import { Chain, getChainByChainId, getChainBySlug } from "@thirdweb-dev/chains";
import {
  ThirdwebSDK,
  ChainOrRpc,
  AddressOrEns,
  SmartContract,
  BaseContractForAddress,
} from "@thirdweb-dev/sdk";
import { ContractAddress } from "@thirdweb-dev/generated-abis";
import { BaseContract, BigNumber } from "ethers";
import { Static } from "@sinclair/typebox";
import { getEnv } from "../loadEnv";
import { networkResponseSchema } from "../schema";
import { isValidHttpUrl } from "../helpers";
import * as fs from "fs";

// Cache the SDK in memory so it doesn't get reinstantiated unless the server crashes
// This saves us from making a request to get the private key for reinstantiation on every request
const sdkMap: Partial<Record<ChainOrRpc, ThirdwebSDK>> = {};

export const getSDK = async (chainName: ChainOrRpc): Promise<ThirdwebSDK> => {
  if (!!sdkMap[chainName]) {
    return sdkMap[chainName] as ThirdwebSDK;
  }

  const THIRDWEB_API_KEY = getEnv("THIRDWEB_API_KEY");
  const WALLET_PRIVATE_KEY = getEnv("WALLET_PRIVATE_KEY", undefined);
  let chain: Chain | null = null;
  try {
    chain = getChainBySlug(chainName);
  } catch (e) {
    try {
      chain = getChainByChainId(BigNumber.from(chainName).toNumber());
    } catch (er) {
      throw er;
    }
  }

  const wallet = new LocalWallet({
    chain,
  });
  wallet.import({ privateKey: WALLET_PRIVATE_KEY, encryption: false });

  // TODO: PLAT-982
  // Currently we require WALLET_PRIVATE_KEY to be set in order to instantiate the SDK
  // But we need to implement wallet.generate() and wallet.save() to save the private key to file system

  const RPC_OVERRIDE_URI = getEnv("RPC_OVERRIDE_URI", undefined);
  let RPC_OVERRIDES: Static<typeof networkResponseSchema>[] = [];

  if (RPC_OVERRIDE_URI) {
    if (isValidHttpUrl(RPC_OVERRIDE_URI)) {
      const result = await fetch(RPC_OVERRIDE_URI);
      RPC_OVERRIDES = await result.json();
    } else {
      const text = fs.readFileSync(RPC_OVERRIDE_URI, "utf8");
      RPC_OVERRIDES = JSON.parse(text);
    }
  }

  const sdk = await ThirdwebSDK.fromWallet(wallet, chainName, {
    thirdwebApiKey: THIRDWEB_API_KEY,
    supportedChains: RPC_OVERRIDES,
  });

  sdkMap[chainName] = sdk;

  return sdk;
};

export const getContractInstance = async <
  TContractAddress extends AddressOrEns | ContractAddress,
>(
  network: ChainOrRpc,
  contract_address: TContractAddress,
): Promise<
  TContractAddress extends ContractAddress
    ? SmartContract<BaseContractForAddress<TContractAddress>>
    : SmartContract<BaseContract>
> => {
  const sdk = await getSDK(network);
  const contract = await sdk.getContract(contract_address);
  return contract;
};
