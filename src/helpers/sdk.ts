import { ThirdwebSDK, ChainOrRpc } from "@thirdweb-dev/sdk";
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
  sdkMap[chainName] = new ThirdwebSDK(chainName);
  return sdkMap[chainName] as ThirdwebSDK;
}
