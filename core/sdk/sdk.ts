import { Static } from "@sinclair/typebox";
import { Chain, getChainByChainId, getChainBySlug } from "@thirdweb-dev/chains";
import { ContractAddress } from "@thirdweb-dev/generated-abis";
import {
  AddressOrEns,
  BaseContractForAddress,
  ChainOrRpc,
  SmartContract,
  ThirdwebSDK,
} from "@thirdweb-dev/sdk";
import { LocalWallet } from "@thirdweb-dev/wallets";
import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { BaseContract, BigNumber } from "ethers";
import * as fs from "fs";
import { env } from "../../env";
import { isValidHttpUrl } from "../helpers";
import { networkResponseSchema } from "../schema";

// Cache the SDK in memory so it doesn't get reinstantiated unless the server crashes
// This saves us from making a request to get the private key for reinstantiation on every request
const sdkMap: Partial<Record<ChainOrRpc, ThirdwebSDK>> = {};

export const getSDK = async (chainName: ChainOrRpc): Promise<ThirdwebSDK> => {
  if (!!sdkMap[chainName]) {
    return sdkMap[chainName] as ThirdwebSDK;
  }


  const THIRDWEB_SDK_SECRET_KEY = env.THIRDWEB_SDK_SECRET_KEY;

  let chain: Chain | null = null;
  let wallet: AwsKmsWallet | LocalWallet | null = null;

  try {
    chain = getChainBySlug(chainName);
  } catch (e) {
    try {
      chain = getChainByChainId(BigNumber.from(chainName).toNumber());
    } catch (er) {
      throw er;
    }
  }

  // Check for KMS
  if (
    "AWS_KMS_KEY_ID" in env.WALLET_KEYS
  ) {
    const AWS_REGION = env.WALLET_KEYS.AWS_REGION;
    const AWS_ACCESS_KEY_ID = env.WALLET_KEYS.AWS_ACCESS_KEY_ID;
    const AWS_SECRET_ACCESS_KEY = env.WALLET_KEYS.AWS_SECRET_ACCESS_KEY;
    const AWS_KMS_KEY_ID = env.WALLET_KEYS.AWS_KMS_KEY_ID;

    wallet = new AwsKmsWallet({
      region: AWS_REGION,
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      keyId: AWS_KMS_KEY_ID,
    });
  } else if ("WALLET_PRIVATE_KEY" in env.WALLET_KEYS) {
    const WALLET_PRIVATE_KEY = env.WALLET_KEYS.WALLET_PRIVATE_KEY;
    wallet = new LocalWallet({
      chain,
    });
    wallet.import({ privateKey: WALLET_PRIVATE_KEY, encryption: false });
  }

  if (!wallet) {
    throw new Error(
      "No wallet found. Please check the Wallet Environment Variables.",
    );
  }
  // TODO: PLAT-982
  // Currently we require WALLET_PRIVATE_KEY to be set in order to instantiate the SDK
  // But we need to implement wallet.generate() and wallet.save() to save the private key to file system

  const CHAIN_OVERRIDES = env.CHAIN_OVERRIDES
  let RPC_OVERRIDES: Static<typeof networkResponseSchema>[] = [];

  if (CHAIN_OVERRIDES) {
    if (isValidHttpUrl(CHAIN_OVERRIDES)) {
      const result = await fetch(CHAIN_OVERRIDES);
      RPC_OVERRIDES = await result.json();
    } else {
      const text = fs.readFileSync(CHAIN_OVERRIDES, "utf8");
      RPC_OVERRIDES = JSON.parse(text);
    }
  }

  const sdk = await ThirdwebSDK.fromWallet(wallet, chainName, {
    // thirdwebApiKey: THIRDWEB_API_KEY,
    secretKey: THIRDWEB_SDK_SECRET_KEY,
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
