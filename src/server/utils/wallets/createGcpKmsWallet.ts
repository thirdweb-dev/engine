import { KeyManagementServiceClient } from "@google-cloud/kms";
import { createWalletDetails } from "../../../db/wallets/createWalletDetails";
import { WalletType } from "../../../schema/wallet";
import { thirdwebClient } from "../../../utils/sdk";
import {
  FetchGcpKmsWalletParamsError,
  fetchGcpKmsWalletParams,
  type GcpKmsWalletParams,
} from "./fetchGcpKmsWalletParams";
import { getGcpKmsResourcePath } from "./gcpKmsResourcePath";
import { getGcpKmsAccount } from "./getGcpKmsAccount";

type CreateGcpKmsWallet = {
  label?: string;
} & Partial<GcpKmsWalletParams>;

export class CreateGcpKmsWalletError extends Error {}

/**
 * Create an GCP KMS wallet, and store it into the database
 * All optional parameters are overrides for the configuration in the database
 * If any required parameter cannot be resolved from either the configuration or the overrides, an error is thrown.
 * If credentials (gcpApplicationCredentialEmail and gcpApplicationCredentialPrivateKey) are explicitly provided, they will be stored separately from the global configuration
 */
export const createGcpKmsWallet = async ({
  label,
  ...overrides
}: CreateGcpKmsWallet): Promise<string> => {
  let params: GcpKmsWalletParams;
  try {
    params = await fetchGcpKmsWalletParams(overrides);
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

  // if email and privateKey are provided explicitly in the request, then they should be stored in walletDetails
  const areCredentialsOverridden = !!(
    overrides.gcpApplicationCredentialEmail &&
    overrides.gcpApplicationCredentialPrivateKey
  );

  await createWalletDetails({
    type: WalletType.gcpKms,
    address: walletAddress,
    label,
    gcpKmsResourcePath: resourcePath,

    ...(areCredentialsOverridden
      ? {
          gcpApplicationCredentialEmail: params.gcpApplicationCredentialEmail,
          gcpApplicationCredentialPrivateKey:
            params.gcpApplicationCredentialPrivateKey,
        }
      : {}),
  });

  return walletAddress;
};
