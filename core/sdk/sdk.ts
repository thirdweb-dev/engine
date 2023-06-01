import { ThirdwebSDK, ChainOrRpc } from "@thirdweb-dev/sdk";
import { getEnv } from "../loadEnv";

// Cache the SDK in memory so it doesn't get reinstantiated unless the server crashes
// This saves us from making a request to get the private key for reinstantiation on every request
const sdkMap: Partial<Record<ChainOrRpc, ThirdwebSDK>> = {};

export async function getSDK(chainName: ChainOrRpc): Promise<ThirdwebSDK> {
  if (!!sdkMap[chainName]) {
    return sdkMap[chainName] as ThirdwebSDK;
  }

  sdkMap[chainName] = ThirdwebSDK.fromPrivateKey(
    getEnv("WALLET_PRIVATE_KEY"),
    chainName,
    { thirdwebApiKey: getEnv("THIRDWEB_API_KEY") },
  );

  return sdkMap[chainName] as ThirdwebSDK;
}
