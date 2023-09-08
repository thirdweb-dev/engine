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
import { AsyncStorage, LocalWallet } from "@thirdweb-dev/wallets";
import { AwsKmsWallet } from "@thirdweb-dev/wallets/evm/wallets/aws-kms";
import { BaseContract, BigNumber } from "ethers";
import { GcpKmsSigner } from "ethers-gcp-kms-signer";
import * as fs from "fs";
import {
  WalletConfigType,
  walletTableSchema,
} from "../../server/schemas/wallet";
import { getWalletDetails } from "../database/dbOperation";
import { env } from "../env";
import { networkResponseSchema } from "../schema";

//TODO add constructor so you can pass in directory
class LocalFileStorage implements AsyncStorage {
  getItem(key: string): Promise<string | null> {
    //read file from home directory/.thirdweb folder
    //file name is the key name
    //return null if it doesn't exist
    //return the value if it does exist
    const dir = `${process.env.HOME}/.thirdweb`;
    if (!fs.existsSync(dir)) {
      return Promise.resolve(null);
    }
    const path = `${dir}/${key}`;
    if (!fs.existsSync(path)) {
      return Promise.resolve(null);
    }
    return Promise.resolve(fs.readFileSync(path, "utf8"));
  }

  setItem(key: string, value: string): Promise<void> {
    //save to home directory .thirdweb folder
    //create the folder if it doesn't exist
    const dir = `${process.env.HOME}/.thirdweb`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(`${dir}/${key}`, value);
    return Promise.resolve();
  }

  removeItem(key: string): Promise<void> {
    //delete the file from home directory/.thirdweb folder
    const dir = `${process.env.HOME}/.thirdweb`;
    if (!fs.existsSync(dir)) {
      return Promise.resolve();
    }
    const path = `${dir}/${key}`;
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
const walletDataMap: Map<string, string> = new Map();

const AWS_REGION = env.AWS_REGION;
const AWS_ACCESS_KEY_ID = env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = env.AWS_SECRET_ACCESS_KEY;
const AWS_KMS_KEY_ID = env.AWS_KMS_KEY_ID;

// Google KMS Wallet
const GOOGLE_KMS_KEY_ID = env.GOOGLE_KMS_KEY_ID;

export const getSDK = async (
  chainName: ChainOrRpc,
  walletOptions?: {
    walletAddress?: string;
    walletType?: string;
    awsKmsKeyId?: string;
    gcpKmsKeyId?: string;
    gcpKmsKeyRingId?: string;
    gcpKmsLocationId?: string;
    gcpKmsKeyVersionId?: string;
    gcpKmsResourcePath?: string;
  },
): Promise<ThirdwebSDK> => {
  chainName = chainName.toLowerCase();
  let {
    walletAddress,
    walletType,
    awsKmsKeyId,
    gcpKmsKeyId,
    gcpKmsKeyRingId,
    gcpKmsKeyVersionId,
    gcpKmsLocationId,
    gcpKmsResourcePath,
  } = walletOptions || {};
  let walletData: Static<typeof walletTableSchema> | undefined;

  let chain: Chain | null = null;
  let sdk: ThirdwebSDK | null = null;
  let wallet: AwsKmsWallet | LocalWallet | null = null;
  let signer: GcpKmsSigner | null = null;
  let RPC_OVERRIDES: Static<typeof networkResponseSchema>[] = [];
  const THIRDWEB_API_SECRET_KEY = env.THIRDWEB_API_SECRET_KEY;

  walletAddress = walletAddress?.toLowerCase();

  if (walletAddress && !walletType && (!awsKmsKeyId || !gcpKmsKeyId)) {
    const rawData = walletDataMap.get(walletAddress);
    if (!rawData) {
      walletData = await getWalletDetails(walletAddress, chainName);
      walletDataMap.set(walletAddress, JSON.stringify(walletData));
    } else {
      walletData = JSON.parse(rawData);
    }

    walletType = walletData?.walletType;
    awsKmsKeyId = walletData?.awsKmsKeyId;
    gcpKmsKeyId = walletData?.gcpKmsKeyId;
    gcpKmsKeyRingId = walletData?.gcpKmsKeyRingId;
    gcpKmsLocationId = walletData?.gcpKmsLocationId;
    gcpKmsKeyVersionId = walletData?.gcpKmsKeyVersionId;
  }

  // console.log(
  //   `walletAddress: ${walletAddress}, walletType: ${walletType}, awsKmsKeyId: ${awsKmsKeyId}, gcpKmsKeyId: ${gcpKmsKeyId}, chainName: ${chainName}`,
  // );
  let sdkMapKey = chainName + "_" + walletAddress;
  if (sdkMap.get(sdkMapKey)) {
    return sdkMap.get(sdkMapKey) as ThirdwebSDK;
  }

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

  if (
    !wallet &&
    walletType === WalletConfigType.aws_kms &&
    (awsKmsKeyId || env.AWS_KMS_KEY_ID)
  ) {
    if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        "AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY must be set in order to use AWS KMS.",
      );
    }

    wallet = new AwsKmsWallet({
      region: AWS_REGION,
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      keyId: awsKmsKeyId || AWS_KMS_KEY_ID!,
    });
  } else if (
    !wallet &&
    walletType === WalletConfigType.gcp_kms &&
    (gcpKmsKeyId || env.GOOGLE_KMS_KEY_ID)
  ) {
    // Google Service A/C credentials Check
    if (
      !env.GOOGLE_APPLICATION_CREDENTIAL_EMAIL ||
      !env.GOOGLE_APPLICATION_CREDENTIAL_PRIVATE_KEY
    ) {
      throw new Error(
        `Please provide needed Google Service A/C credentials in order to use GCP KMS.
        Check for GOOGLE_APPLICATION_CREDENTIAL_PRIVATE_KEY and GOOGLE_APPLICATION_CREDENTIAL_EMAIL in .env file`,
      );
    }

    if (
      !env.GOOGLE_KMS_KEY_RING_ID ||
      !(gcpKmsKeyVersionId || env.GOOGLE_KMS_KEY_VERSION_ID) ||
      !env.GOOGLE_KMS_LOCATION_ID ||
      !env.GOOGLE_APPLICATION_PROJECT_ID
    ) {
      throw new Error(
        "GOOGLE_APPLICATION_PROJECT_ID, GOOGLE_KMS_KEY_RING_ID, GOOGLE_KMS_KEY_VERSION_ID, and GOOGLE_KMS_LOCATION_ID must be set in order to use GCP KMS. Please check .env file",
      );
    }

    const kmsCredentials = {
      projectId: env.GOOGLE_APPLICATION_PROJECT_ID,
      locationId: env.GOOGLE_KMS_LOCATION_ID,
      keyRingId: env.GOOGLE_KMS_KEY_RING_ID,
      keyId: gcpKmsKeyId || GOOGLE_KMS_KEY_ID!,
      keyVersion: gcpKmsKeyVersionId || env.GOOGLE_KMS_KEY_VERSION_ID!,
    };

    signer = new GcpKmsSigner(kmsCredentials);
    sdk = ThirdwebSDK.fromSigner(signer, chainName, {
      secretKey: THIRDWEB_API_SECRET_KEY,
      supportedChains: RPC_OVERRIDES,
    });
  } else if (
    !wallet &&
    walletType === WalletConfigType.ppk &&
    env.WALLET_PRIVATE_KEY !== undefined
  ) {
    // console.log(`Inside PPK`);
    const WALLET_PRIVATE_KEY = env.WALLET_PRIVATE_KEY;
    wallet = new LocalWallet({
      chain,
    });
    wallet.import({ privateKey: WALLET_PRIVATE_KEY, encryption: false });
  } else {
    wallet = new LocalWallet({
      chain,
      storage: new LocalFileStorage(),
    });
    await wallet.loadOrCreate({
      strategy: "encryptedJson",
      password: THIRDWEB_API_SECRET_KEY,
    });
  }

  // console.log("wallet: ", await wallet.getAddress());
  // TODO: PLAT-982
  // Currently we require WALLET_PRIVATE_KEY to be set in order to instantiate the SDK
  // But we need to implement wallet.generate() and wallet.save() to save the private key to file system

  if (!sdk && !signer && wallet) {
    if (!wallet) {
      throw new Error(
        "No wallet found. Please check the Wallet Environment Variables.",
      );
    }

    sdk = await ThirdwebSDK.fromWallet(wallet, chainName, {
      secretKey: THIRDWEB_API_SECRET_KEY,
      supportedChains: RPC_OVERRIDES,
    });
  }

  if (!sdk) {
    throw new Error(
      "SDK not instantiated. Please check the Wallet Environment Variables.",
    );
  }

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
    walletAddress: walletData?.walletAddress.toLowerCase(),
    walletType: walletData?.walletType,
    awsKmsKeyId: walletData?.awsKmsKeyId,
    gcpKmsKeyId: walletData?.gcpKmsKeyId,
    gcpKmsKeyRingId: walletData?.gcpKmsKeyRingId,
    gcpKmsLocationId: walletData?.gcpKmsLocationId,
    gcpKmsKeyVersionId: walletData?.gcpKmsKeyVersionId,
    // gcpKmsResourcePath: walletData?.gcpKmsResourcePath,
  });
  const contract = await sdk.getContract(contract_address);
  return contract;
};
