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
import { walletTableSchema } from "../../server/schemas/wallet";
import { getWalletDetails } from "../database/dbOperation";
import { env } from "../env";
import { isValidHttpUrl } from "../helpers";
import { networkResponseSchema } from "../schema";

// Cache the SDK in memory so it doesn't get reinstantiated unless the server crashes
// This saves us from making a request to get the private key for reinstantiation on every request
const sdkMap: Map<string, ThirdwebSDK> = new Map();
const walletDataMap: Map<string, string> = new Map();

const AWS_REGION = env.AWS_REGION;
const AWS_ACCESS_KEY_ID = env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = env.AWS_SECRET_ACCESS_KEY;
const AWS_KMS_KEY_ID =
  "AWS_KMS_KEY_ID" in env.WALLET_KEYS ? env.WALLET_KEYS.AWS_KMS_KEY_ID : "";

export const getSDK = async (
  chainName: ChainOrRpc,
  walletOptions?: {
    walletAddress?: string;
    walletType?: string;
    awsKmsKeyId?: string;
    gcpKmsKeyId?: string;
  },
): Promise<ThirdwebSDK> => {
  let walletAddress = walletOptions?.walletAddress || "";
  let sdkMapKey = chainName + "_" + walletAddress;
  if (sdkMap.get(sdkMapKey)) {
    return sdkMap.get(sdkMapKey) as ThirdwebSDK;
  }

  const THIRDWEB_SDK_SECRET_KEY = env.THIRDWEB_SDK_SECRET_KEY;

  let chain: Chain | null = null;
  let wallet: AwsKmsWallet | LocalWallet | null = null;

  try {
    chain = getChainBySlug(chainName.toLowerCase());
  } catch (e) {
    try {
      chain = getChainByChainId(
        BigNumber.from(chainName.toLowerCase()).toNumber(),
      );
    } catch (er) {
      throw er;
    }
  }

  if (walletOptions?.awsKmsKeyId || "AWS_KMS_KEY_ID" in env.WALLET_KEYS) {
    if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        "AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY must be set in order to use AWS KMS.",
      );
    }

    wallet = new AwsKmsWallet({
      region: AWS_REGION,
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      keyId: walletOptions?.awsKmsKeyId || AWS_KMS_KEY_ID,
    });
  } else if (
    walletOptions?.walletType === "ppk" ||
    "WALLET_PRIVATE_KEY" in env.WALLET_KEYS
  ) {
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

  const CHAIN_OVERRIDES = env.CHAIN_OVERRIDES;
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
  walletAddress = await sdk.wallet.getAddress();
  sdkMapKey = chainName + "_" + walletAddress;
  sdkMap.set(sdkMapKey, sdk);

  return sdk;
};

export const getContractInstance = async <
  TContractAddress extends AddressOrEns | ContractAddress,
>(
  network: ChainOrRpc,
  contract_address: TContractAddress,
  from?: string,
): Promise<
  TContractAddress extends ContractAddress
    ? SmartContract<BaseContractForAddress<TContractAddress>>
    : SmartContract<BaseContract>
> => {
  let walletData: Static<typeof walletTableSchema> | undefined;
  if (from) {
    from = from.toLowerCase();
    const rawData = walletDataMap.get(from);
    if (!rawData) {
      walletData = await getWalletDetails(from, network);
      walletDataMap.set(from, JSON.stringify(walletData));
    } else {
      walletData = JSON.parse(rawData);
    }
  }
  const sdk = await getSDK(network, {
    walletAddress: from,
    walletType: walletData?.walletType,
    awsKmsKeyId: walletData?.awsKmsKeyId,
  });
  const contract = await sdk.getContract(contract_address);
  return contract;
};
