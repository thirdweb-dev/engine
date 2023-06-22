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
import { getEnv } from "../loadEnv";

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
  if (WALLET_PRIVATE_KEY) {
    wallet.import({ privateKey: WALLET_PRIVATE_KEY, encryption: false });
  } else {
    // wallet.generate();
    //TODO - save the private key to file system
    //wallet.save({ encryption: false, strategy: "privateKey" });
  }

  // Need to make this instantiate SDK with read/write. For that will need wallet information
  const sdk = await ThirdwebSDK.fromWallet(wallet, chainName, {
    thirdwebApiKey: THIRDWEB_API_KEY,
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
