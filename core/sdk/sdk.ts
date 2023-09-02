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
import {
  WalletConfigType,
  walletTableSchema,
} from "../../server/schemas/wallet";
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
  chainName = chainName.toLowerCase();
  let { walletAddress, walletType, awsKmsKeyId, gcpKmsKeyId } =
    walletOptions || {};
  let walletData: Static<typeof walletTableSchema> | undefined;

  if (
    walletAddress &&
    !walletOptions?.walletType &&
    (!walletOptions?.awsKmsKeyId || !walletOptions?.gcpKmsKeyId)
  ) {
    // console.log("IF CHECK in SDK(). GET FROM DB");
    walletAddress = walletAddress.toLowerCase();
    const rawData = walletDataMap.get(walletAddress);
    if (!rawData) {
      walletData = await getWalletDetails(walletAddress, chainName);
      walletDataMap.set(walletAddress, JSON.stringify(walletData));
    } else {
      walletData = JSON.parse(rawData);
    }

    walletType = walletData?.walletType;
    awsKmsKeyId = walletData?.awsKmsKeyId;
    // gcpKmsKeyId = walletData?.gcpKmsKeyId;
  }

  // console.log(
  //   `walletAddress: ${walletAddress}, walletType: ${walletType}, awsKmsKeyId: ${awsKmsKeyId}, gcpKmsKeyId: ${gcpKmsKeyId}`,
  // );
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

  if (
    !wallet &&
    walletType === WalletConfigType.aws_kms &&
    (awsKmsKeyId || "AWS_KMS_KEY_ID" in env.WALLET_KEYS)
  ) {
    if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        "AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY must be set in order to use AWS KMS.",
      );
    }
    // console.log(`Inside AWSKMS`);

    wallet = new AwsKmsWallet({
      region: AWS_REGION,
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      keyId: awsKmsKeyId || AWS_KMS_KEY_ID,
    });
  } else if (!wallet && walletType === WalletConfigType.gcp_kms) {
    if (!env.GCP_KEY_RING_ID || !env.GCP_LOCATION_ID || !env.GCP_PROJECT_ID) {
      throw new Error(
        "GCP_KEY_RING_ID or GCP_LOCATION_ID or GCP_PROJECT_ID is not defined. Please check .env file",
      );
    }

    // const kmsCredentials = {
    //   projectId: env.GCP_PROJECT_ID, // your project id in gcp
    //   locationId: env.GCP_LOCATION_ID, // the location where your key ring was created
    //   keyRingId: env.GCP_KEY_RING_ID, // the id of the key ring
    //   keyId: walletData?.gcpKmsKeyId, // the name/id of your key in the key ring
    //   keyVersion: walletData?.gcpKmsKeyVersion, // the version of the key
    // };

    // const client = new KeyManagementServiceClient({
    //   credentials: {
    //     type: "service_account",
    //     // private_key_id: "41baca7a34a1723051a2842a59f9b3ad5ec44f06",
    //     // private_key:
    //       ,
    //     // client_email:

    //     // client_id:
    //     // auth_uri: "https://accounts.google.com/o/oauth2/auth",
    //     // token_uri: "https://oauth2.googleapis.com/token",
    //     // auth_provider_x509_cert_url:"https://www.googleapis.com/oauth2/v1/certs",
    //     // client_x509_cert_url:"https://www.googleapis.com/robot/v1/metadata/x509/thirdweb-test-01%40thrdweb-biyvmatstwcbrb08y692g.iam.gserviceaccount.com",
    //     // universe_domain: "googleapis.com",
    //   },
    //   projectId: "thrdweb-biyvmatstwcbrb08y692g",
    // });

    // // Build the parent key ring name
    // const keyRingName = client.keyRingPath(
    //   kmsCredentials.projectId,
    //   kmsCredentials.locationId,
    //   kmsCredentials.keyRingId,
    // );
    // const [key] = await client.createCryptoKey({
    //   parent: keyRingName,
    //   cryptoKeyId: `web3api-${new Date().getTime()}`,
    //   cryptoKey: {
    //     purpose: "ASYMMETRIC_SIGN",
    //     versionTemplate: {
    //       algorithm: "RSA_SIGN_PKCS1_2048_SHA256",
    //     },
    //   },
    // });
    // console.log(key.name);

    // const [publicKey] = await client.getPublicKey({
    //   name: key.name,
    // });

    // // Optional, but recommended: perform integrity verification on publicKey.
    // // For more details on ensuring E2E in-transit integrity to and from Cloud KMS visit:
    // // https://cloud.google.com/kms/docs/data-integrity-guidelines
    // const crc32c = require("fast-crc32c");
    // if (publicKey.name !== key.name) {
    //   throw new Error("GetPublicKey: request corrupted in-transit");
    // }
    // if (crc32c.calculate(publicKey.pem) !== Number(publicKey.pemCrc32c.value)) {
    //   throw new Error("GetPublicKey: response corrupted in-transit");
    // }

    // console.log(`Public key pem: ${publicKey.pem}`);
  } else if (
    !wallet &&
    (walletType === WalletConfigType.ppk ||
      "WALLET_PRIVATE_KEY" in env.WALLET_KEYS)
  ) {
    // console.log(`Inside PPK`);
    const WALLET_PRIVATE_KEY =
      "WALLET_PRIVATE_KEY" in env.WALLET_KEYS
        ? env.WALLET_KEYS.WALLET_PRIVATE_KEY
        : "";
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

  // console.log("wallet: ", await wallet.getAddress());
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
