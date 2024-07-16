import { Configuration } from "@prisma/client";
import { WalletType } from "./wallet";

export interface Config
  extends Omit<
    Configuration,
    | "awsAccessKeyId"
    | "awsSecretAccessKey"
    | "awsRegion"
    | "gcpApplicationProjectId"
    | "gcpKmsLocationId"
    | "gcpKmsKeyRingId"
    | "gcpApplicationCredentialEmail"
    | "gcpApplicationCredentialPrivateKey"
    | "contractSubscriptionsRetryDelaySeconds"
  > {
  walletConfiguration: {
    awsAccessKeyId?: string;
    awsSecretAccessKey?: string;
    awsRegion?: string;
    gcpApplicationProjectId?: string;
    gcpKmsLocationId?: string;
    gcpKmsKeyRingId?: string;
    gcpApplicationCredentialEmail?: string;
    gcpApplicationCredentialPrivateKey?: string;
  };
  contractSubscriptionsRequeryDelaySeconds: string;
}
