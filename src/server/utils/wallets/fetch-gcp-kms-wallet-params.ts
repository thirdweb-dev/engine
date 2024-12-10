import { getConfig } from "../../../shared/utils/cache/get-config";

export type GcpKmsWalletParams = {
  gcpApplicationCredentialEmail: string;
  gcpApplicationCredentialPrivateKey: string;

  gcpApplicationProjectId: string;
  gcpKmsKeyRingId: string;
  gcpKmsLocationId: string;
};

export class FetchGcpKmsWalletParamsError extends Error {}

/**
 * Fetches the GCP KMS wallet creation parameters from the configuration or overrides.
 * If any required parameter cannot be resolved from either the configuration or the overrides, an error is thrown.
 */
export async function fetchGcpKmsWalletParams(
  overrides: Partial<GcpKmsWalletParams>,
) {
  const config = await getConfig();

  const gcpApplicationCredentialEmail =
    overrides.gcpApplicationCredentialEmail ??
    config.walletConfiguration.gcp?.gcpApplicationCredentialEmail;

  if (!gcpApplicationCredentialEmail) {
    throw new FetchGcpKmsWalletParamsError(
      "GCP application credential email is required for this wallet type. Could not find in configuration or params.",
    );
  }

  const gcpApplicationCredentialPrivateKey =
    overrides.gcpApplicationCredentialPrivateKey ??
    config.walletConfiguration.gcp?.gcpApplicationCredentialPrivateKey;

  if (!gcpApplicationCredentialPrivateKey) {
    throw new FetchGcpKmsWalletParamsError(
      "GCP application credential private key is required for this wallet type. Could not find in configuration or params.",
    );
  }

  const gcpApplicationProjectId =
    overrides.gcpApplicationProjectId ??
    config.walletConfiguration.gcp?.defaultGcpApplicationProjectId;

  if (!gcpApplicationProjectId) {
    throw new FetchGcpKmsWalletParamsError(
      "GCP application project ID is required for this wallet type. Could not find in configuration or params.",
    );
  }

  const gcpKmsKeyRingId =
    overrides.gcpKmsKeyRingId ??
    config.walletConfiguration.gcp?.defaultGcpKmsKeyRingId;

  if (!gcpKmsKeyRingId) {
    throw new FetchGcpKmsWalletParamsError(
      "GCP KMS key ring ID is required for this wallet type. Could not find in configuration or params.",
    );
  }

  const gcpKmsLocationId =
    overrides.gcpKmsLocationId ??
    config.walletConfiguration.gcp?.defaultGcpKmsLocationId;

  if (!gcpKmsLocationId) {
    throw new FetchGcpKmsWalletParamsError(
      "GCP KMS location ID is required for this wallet type. Could not find in configuration or params.",
    );
  }

  return {
    gcpApplicationCredentialEmail,
    gcpApplicationCredentialPrivateKey,
    gcpApplicationProjectId,
    gcpKmsKeyRingId,
    gcpKmsLocationId,
  };
}
