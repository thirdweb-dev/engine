import { ThirdwebSDK, ChainOrRpc } from "@thirdweb-dev/sdk";
import { AwsKmsWallet } from "@thirdweb-dev/sdk/evm/wallets";

// Cache the SDK in memory so it doesn't get reinstantiated unless the server crashes
// This saves us from making a request to get the private key for reinstantiation on every request
const sdkMap: Partial<Record<ChainOrRpc, ThirdwebSDK>> = {};

export async function getSDK(chainName: ChainOrRpc): Promise<ThirdwebSDK> {
  if (!!sdkMap[chainName]) {
    return sdkMap[chainName] as ThirdwebSDK;
  }

  const wallet = new AwsKmsWallet({
    region: process.env.AWS_REGION as string,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    keyId: process.env.AWS_KMS_KEY_ID as string,
  });

  sdkMap[chainName] = await ThirdwebSDK.fromWallet(wallet, chainName);
  return sdkMap[chainName] as ThirdwebSDK;
}
