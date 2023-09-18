import { Static } from "@sinclair/typebox";
import { Chain, getChainByChainId, getChainBySlug } from "@thirdweb-dev/chains";
import { ContractAddress } from "@thirdweb-dev/generated-abis";
import { AddressOrEns, ChainOrRpc, ThirdwebSDK } from "@thirdweb-dev/sdk";
import { AsyncStorage, LocalWallet } from "@thirdweb-dev/wallets";
import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { GcpKmsSigner } from "ethers-gcp-kms-signer";
import * as fs from "fs";
import { walletTableSchema } from "../../server/schemas/wallet";
import { getAwsKmsWallet } from "../../server/utils/wallets/getAwsKmsWallet";
import { getGcpKmsSigner } from "../../server/utils/wallets/getGcpKmsSigner";
import { getLocalWallet } from "../../server/utils/wallets/getLocalWallet";
import { getWalletDetails } from "../../src/db/wallets/getWalletDetails";
import { PrismaTransaction } from "../../src/schema/prisma";
import { WalletType } from "../../src/schema/wallet";
import { env } from "../env";
import { networkResponseSchema } from "../schema";

//TODO add constructor so you can pass in directory
export class LocalFileStorage implements AsyncStorage {
  constructor(private readonly walletAddress?: string) {
    if (walletAddress) {
      this.walletAddress = walletAddress;
    }
  }

  getKey(): string {
    if (this.walletAddress) {
      return `localWallet-${this.walletAddress.toLowerCase()}`;
    }
    throw new Error("Wallet Address not set");
  }

  getItem(_: string): Promise<string | null> {
    //read file from home directory/.thirdweb folder
    //file name is the key name
    //return null if it doesn't exist
    //return the value if it does exist
    const dir = `${process.env.HOME}/.thirdweb`;
    if (!fs.existsSync(dir)) {
      return Promise.resolve(null);
    }

    const path = `${dir}/${this.getKey()}`;
    if (!fs.existsSync(path)) {
      return Promise.resolve(null);
    }
    return Promise.resolve(fs.readFileSync(path, "utf8"));
  }

  setItem(_: string, value: string): Promise<void> {
    //save to home directory .thirdweb folder
    //create the folder if it doesn't exist
    const dir = `${process.env.HOME}/.thirdweb`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(`${dir}/${this.getKey()}`, value);
    return Promise.resolve();
  }

  removeItem(_: string): Promise<void> {
    //delete the file from home directory/.thirdweb folder
    const dir = `${process.env.HOME}/.thirdweb`;
    if (!fs.existsSync(dir)) {
      return Promise.resolve();
    }
    const path = `${dir}/${this.getKey()}`;
    if (!fs.existsSync(path)) {
      return Promise.resolve();
    } else {
      fs.unlinkSync(path);
      return Promise.resolve();
    }
  }
}

// Cache the SDK in memory so it doesn't get reinstantiated unless the server crashes
// This saves us from making a request to get the private key for reinstantiation on every request
const sdkMap: Map<string, ThirdwebSDK> = new Map();
const getCachedSdk = async (chainName: string, walletAddress?: string) => {
  const key = walletAddress ? chainName + "_" + walletAddress : chainName;
  const sdk = sdkMap.get(key);
  if (sdk) {
    return sdk;
  }
  return null;
};

const cacheSdk = (
  chainName: string,
  sdk: ThirdwebSDK,
  walletAddress?: string,
) => {
  const key = walletAddress ? chainName + "_" + walletAddress : chainName;
  sdkMap.set(key, sdk);
};

const walletDataMap: Map<string, string> = new Map();
const getCachedWallet = async (
  walletAddress: string,
  chainId: number,
  pgtx?: PrismaTransaction,
) => {
  walletAddress = walletAddress.toLowerCase();
  let walletData;
  const cachedWallet = walletDataMap.get(walletAddress);
  if (cachedWallet) {
    walletData = JSON.parse(cachedWallet);
  } else {
    // TODO: This needs to be changed...
    walletData = await getWalletDetails({
      pgtx,
      address: walletAddress,
    });
    if (walletData) {
      walletDataMap.set(walletAddress, JSON.stringify(walletData));
    }
  }
  return walletData;
};

const THIRDWEB_API_SECRET_KEY = env.THIRDWEB_API_SECRET_KEY;

export const getSDK = async (
  chainName: ChainOrRpc,
  walletAddress?: string,
  pgtx?: PrismaTransaction,
): Promise<ThirdwebSDK> => {
  let walletData: Static<typeof walletTableSchema> | undefined;

  let chain: Chain | null = null;
  let sdk: ThirdwebSDK | null = null;
  let wallet: AwsKmsWallet | LocalWallet | null = null;
  let signer: GcpKmsSigner | null = null;
  let RPC_OVERRIDES: Static<typeof networkResponseSchema>[] = [];

  try {
    chain = getChainBySlug(chainName.toLowerCase());
  } catch (e) {
    try {
      chain = getChainByChainId(parseInt(chainName.toLowerCase()));
    } catch (er) {
      throw new Error(`Chain not found for chainName: ${chainName}`);
    }
  }

  sdk = await getCachedSdk(chain.name, walletAddress);
  if (sdk) {
    return sdk;
  }

  //SDK doesn't exist in cache, so we need to instantiate or create it
  if (!walletAddress) {
    //create sdk with no wallet
    // TODO set to read only when we can
    sdk = new ThirdwebSDK(chain, {
      secretKey: THIRDWEB_API_SECRET_KEY,
      supportedChains: RPC_OVERRIDES,
    });
    cacheSdk(chain.name, sdk);
    return sdk;
  }

  walletData = await getCachedWallet(walletAddress, chain.chainId, pgtx);

  if (!walletData) {
    throw new Error(`Wallet not found for address: ${walletAddress}`);
  }

  const walletType = walletData.type;
  const awsKmsKeyId = walletData.awsKmsKeyId;
  const gcpKmsKeyId = walletData.gcpKmsKeyId;
  const gcpKmsKeyVersionId = walletData.gcpKmsKeyVersionId;

  console.log(
    `getSDK walletAddress: ${walletAddress}, walletType: ${walletType}, awsKmsKeyId: ${awsKmsKeyId}, gcpKmsKeyId: ${gcpKmsKeyId}, chainName: ${chainName}`,
  );

  if (walletType === WalletType.awsKms) {
    if (!awsKmsKeyId) {
      throw new Error("Wallet does not specify awsKmsKeyId");
    }

    const wallet = getAwsKmsWallet({ awsKmsKeyId });
    // Note: if wallet has a chain, it will get used instead of chain specified here
    sdk = await ThirdwebSDK.fromWallet(wallet, chain, {
      secretKey: THIRDWEB_API_SECRET_KEY,
      supportedChains: RPC_OVERRIDES,
    });
    walletAddress = await sdk.wallet.getAddress();
    cacheSdk(chain.name, sdk, walletAddress);
    return sdk;
  } else if (walletType === WalletType.gcpKms) {
    if (!(gcpKmsKeyId && gcpKmsKeyVersionId)) {
      throw new Error(
        "Wallet does not specify gcpKmsKeyId or gcpKmsKeyVersionId",
      );
    }

    const signer = getGcpKmsSigner({ gcpKmsKeyId, gcpKmsKeyVersionId });
    // Note: if signer has a chain, it will get used instead of chain specified here
    sdk = ThirdwebSDK.fromSigner(signer, chain, {
      secretKey: THIRDWEB_API_SECRET_KEY,
      supportedChains: RPC_OVERRIDES,
    });
    cacheSdk(chain.name, sdk, walletAddress);
    return sdk;
  } else if (walletType === WalletType.local) {
    const wallet = await getLocalWallet({ chain, walletAddress });
    // Note: chain doesn't actually get respected here, comes from wallet
    sdk = await ThirdwebSDK.fromWallet(wallet, chain, {
      secretKey: THIRDWEB_API_SECRET_KEY,
      supportedChains: RPC_OVERRIDES,
    });
    cacheSdk(chain.name, sdk, walletAddress);
    return sdk;
  }

  throw new Error("SDK / wallet doesn't exist");
};

export const getContractInstance = async <
  TContractAddress extends AddressOrEns | ContractAddress,
>(
  network: ChainOrRpc,
  contract_address: TContractAddress,
  walletAddress?: string,
) => {
  const sdk = await getSDK(network, walletAddress);
  const contract = await sdk.getContract(contract_address);
  return contract;
};
