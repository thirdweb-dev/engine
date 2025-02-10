import { KeyManagementServiceClient } from "@google-cloud/kms";
import { createWalletDetails } from "../../../shared/db/wallets/create-wallet-details.js";
import { WalletType } from "../../../shared/schemas/wallet.js";
import { thirdwebClient } from "../../../shared/utils/sdk.js";
import {
  FetchGcpKmsWalletParamsError,
  fetchGcpKmsWalletParams,
  type GcpKmsWalletParams,
} from "./fetch-gcp-kms-wallet-params.js";
import { getGcpKmsResourcePath } from "./gcp-kms-resource-path.js";
import { getGcpKmsAccount } from "./get-gcp-kms-account.js";

export type CreateGcpKmsWalletParams = {
  label?: string;
} & Partial<GcpKmsWalletParams>;

export class CreateGcpKmsWalletError extends Error {}

/**
 * Create a GCP KMS wallet, and store it into the database
 * All optional parameters are overrides for the configuration in the database
 * If any required parameter cannot be resolved from either the configuration or the overrides, an error is thrown.
 * Credentials (gcpApplicationCredentialEmail and gcpApplicationCredentialPrivateKey) are stored separately from the global configuration
 */
export const createGcpKmsWalletDetails = async ({
  label,
  ...overrides
}: CreateGcpKmsWalletParams): Promise<string> => {
  const { walletAddress, resourcePath, params } =
    await createGcpKmsKey(overrides);

  await createWalletDetails({
    type: WalletType.gcpKms,
    address: walletAddress,
    label,
    gcpKmsResourcePath: resourcePath,

    gcpApplicationCredentialEmail: params.gcpApplicationCredentialEmail,
    gcpApplicationCredentialPrivateKey:
      params.gcpApplicationCredentialPrivateKey,
  });

  return walletAddress;
};

/**
 * Creates a GCP KMS wallet and returns the GCP KMS resource path. DOES NOT store the wallet in the database.
 * All optional parameters are overrides for the configuration in the database
 * If any required parameter cannot be resolved from either the configuration or the overrides, an error is thrown.
 */
export const createGcpKmsKey = async (
  partialParams: Partial<GcpKmsWalletParams>,
) => {
  let params: GcpKmsWalletParams;
  try {
    params = await fetchGcpKmsWalletParams(partialParams);
  } catch (e) {
    if (e instanceof FetchGcpKmsWalletParamsError) {
      throw new CreateGcpKmsWalletError(e.message);
    }
    throw e;
  }

  const client = new KeyManagementServiceClient({
    credentials: {
      client_email: params.gcpApplicationCredentialEmail,
      private_key: params.gcpApplicationCredentialPrivateKey
        .split(String.raw`\n`)
        .join("\n"),
    },
    projectId: params.gcpApplicationProjectId,
  });

  // TODO: What should we set this to?
  const cryptoKeyId = `ec-web3api-${new Date().getTime()}`;
  const [key] = await client.createCryptoKey({
    parent: client.keyRingPath(
      params.gcpApplicationProjectId,
      params.gcpKmsLocationId,
      params.gcpKmsKeyRingId,
    ),
    cryptoKeyId,
    cryptoKey: {
      purpose: "ASYMMETRIC_SIGN",
      versionTemplate: {
        algorithm: "EC_SIGN_SECP256K1_SHA256",
        protectionLevel: "HSM",
      },
    },
  });

  await client.close();

  const resourcePath = getGcpKmsResourcePath({
    projectId: params.gcpApplicationProjectId,
    locationId: params.gcpKmsLocationId,
    keyRingId: params.gcpKmsKeyRingId,
    cryptoKeyId: cryptoKeyId,
    versionId: "1",
  });

  if (`${key.name}/cryptoKeyVersions/1` !== resourcePath) {
    throw new CreateGcpKmsWalletError(
      `Expected created key resource path to be ${resourcePath}, but got ${key.name}`,
    );
  }

  const account = await getGcpKmsAccount({
    client: thirdwebClient,
    name: resourcePath,
    clientOptions: {
      credentials: {
        client_email: params.gcpApplicationCredentialEmail,
        private_key: params.gcpApplicationCredentialPrivateKey,
      },
    },
  });

  const walletAddress = account.address;

  return {
    walletAddress,
    resourcePath,
    params,
  };
};
