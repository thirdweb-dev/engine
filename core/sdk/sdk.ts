import {
  ThirdwebSDK,
  ChainOrRpc,
  AddressOrEns,
  SmartContract,
  BaseContractForAddress,
} from "@thirdweb-dev/sdk";

import {
  ContractAddress
} from "@thirdweb-dev/generated-abis";

import { BaseContract } from "ethers";
import { getEnv } from "../loadEnv";
// import { AwsKmsWallet } from '@thirdweb-dev/sdk/evm/wallets';

// Cache the SDK in memory so it doesn't get reinstantiated unless the server crashes
// This saves us from making a request to get the private key for reinstantiation on every request
const sdkMap: Partial<Record<ChainOrRpc, ThirdwebSDK>> = {};

export const getSDK = async (chainName: ChainOrRpc): Promise<ThirdwebSDK> => {
  if (!!sdkMap[chainName]) {
    return sdkMap[chainName] as ThirdwebSDK;
  }

  // Need to make this instantiate SDK with read/write. For that will need wallet information
  // Currently only doing read-only mode as per Docs
  // if (getEnv('NODE_ENV') === 'local'){
  sdkMap[chainName] = await ThirdwebSDK.fromPrivateKey(
    getEnv("WALLET_PRIVATE_KEY"),
    chainName,
    { thirdwebApiKey: getEnv("THIRDWEB_API_KEY") },
  );
  // }
  // else if (getEnv('USE_WALLET') === 'true') {
  //   const wallet = new AwsKmsWallet({
  //     region: getEnv('AWS_REGION') as string,
  //     accessKeyId: getEnv('AWS_ACCESS_KEY_ID') as string,
  //     secretAccessKey: getEnv('AWS_SECRET_ACCESS_KEY') as string,
  //     keyId: getEnv('AWS_KMS_KEY_ID') as string,
  //   });
  //   sdkMap[chainName] = await ThirdwebSDK.fromWallet(wallet, chainName);
  // }
  // else {
  //   sdkMap[chainName] = new ThirdwebSDK(chainName);
  // }

  return sdkMap[chainName] as ThirdwebSDK;
}


export const getContractInstace = async <TContractAddress extends AddressOrEns | ContractAddress>(
  chain_name_or_id: ChainOrRpc,
  contract_address: TContractAddress
): Promise<TContractAddress extends ContractAddress ? SmartContract<BaseContractForAddress<TContractAddress>> : SmartContract<BaseContract>> => {
  const sdk = await getSDK(chain_name_or_id);
  const contract = await sdk.getContract(contract_address);
  return contract;
}