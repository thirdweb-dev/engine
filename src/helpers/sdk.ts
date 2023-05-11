import { ThirdwebSDK, ChainOrRpc } from "@thirdweb-dev/sdk";
import { getEnv } from '../loadEnv';
import { logger } from "../utilities/logger";
// import { AwsKmsWallet } from "@thirdweb-dev/sdk/evm/wallets";

// Cache the SDK in memory so it doesn't get reinstantiated unless the server crashes
// This saves us from making a request to get the private key for reinstantiation on every request
const sdkMap: Partial<Record<ChainOrRpc, ThirdwebSDK>> = {};

export async function getSDK(chainName: ChainOrRpc): Promise<ThirdwebSDK> {
  if (!!sdkMap[chainName]) {
    return sdkMap[chainName] as ThirdwebSDK;
  }

  // Need to make this instantiate SDK with read/write. For that will need wallet information
  // Currently only doing read-only mode as per Docs
  if (getEnv('NODE_ENV') === 'local'){
    sdkMap[chainName] = await ThirdwebSDK.fromPrivateKey(getEnv('WALLET_PRIVATE_KEY'), chainName);  
  }
  // else if (getEnv('USE_WALLET') === 'true') {
  //   const wallet = new AwsKmsWallet({
  //     region: getEnv('AWS_REGION') as string,
  //     accessKeyId: getEnv('AWS_ACCESS_KEY_ID') as string,
  //     secretAccessKey: getEnv('AWS_SECRET_ACCESS_KEY') as string,
  //     keyId: getEnv('AWS_KMS_KEY_ID') as string,
  //   });
  //   sdkMap[chainName] = await ThirdwebSDK.fromWallet(wallet, chainName);
  // }
  else {
    sdkMap[chainName] = new ThirdwebSDK(chainName);
  }
  
  return sdkMap[chainName] as ThirdwebSDK;
}