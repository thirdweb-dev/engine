import { ThirdwebSDK, ChainOrRpc } from "@thirdweb-dev/sdk";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { getEnv } from "../loadEnv";
import { getChainIdFromNetwork } from "@thirdweb-dev/sdk";
import { getChainBySlug } from "@thirdweb-dev/chains";
// import { AwsKmsWallet } from '@thirdweb-dev/sdk/evm/wallets';

// Cache the SDK in memory so it doesn't get reinstantiated unless the server crashes
// This saves us from making a request to get the private key for reinstantiation on every request
const sdkMap: Partial<Record<ChainOrRpc, ThirdwebSDK>> = {};

export async function getSDK(chainName: ChainOrRpc): Promise<ThirdwebSDK> {
  if (!!sdkMap[chainName]) {
    return sdkMap[chainName] as ThirdwebSDK;
  }

  const THIRDWEB_API_KEY = getEnv("THIRDWEB_API_KEY");
  const WALLET_PRIVATE_KEY = getEnv("WALLET_PRIVATE_KEY");
  const wallet = new LocalWallet({ chain: getChainBySlug(chainName) });
  if (WALLET_PRIVATE_KEY) {
    wallet.import({ privateKey: WALLET_PRIVATE_KEY, encryption: false });
  } else {
    wallet.generate();
  }

  // Need to make this instantiate SDK with read/write. For that will need wallet information
  const sdk = await ThirdwebSDK.fromWallet(wallet, chainName, {
    thirdwebApiKey: THIRDWEB_API_KEY,
  });
  sdkMap[chainName] = sdk;

  return sdk;
}
