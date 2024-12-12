import type { Configuration } from "@prisma/client";
import type { Chain } from "thirdweb";
import type { CircleCredential } from "../db/configuration/getConfiguration";
import type { WalletType } from "./wallet";

export type AwsWalletConfiguration = {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;

  defaultAwsRegion: string;
};

export type GcpWalletConfiguration = {
  gcpApplicationCredentialEmail: string;
  gcpApplicationCredentialPrivateKey: string;

  // these values are used as default so users don't need to specify them every time to the create wallet endpoint
  // for fetching a wallet, always trust the resource path in the wallet details
  // only use these values for creating a new wallet, when the resource path is not known
  defaultGcpKmsLocationId: string;
  defaultGcpKmsKeyRingId: string;
  defaultGcpApplicationProjectId: string;
};

export interface ParsedConfig
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
    | "walletProviderCredentials"
    | "contractSubscriptionsRetryDelaySeconds"
  > {
  walletConfiguration: {
    aws: AwsWalletConfiguration | null;
    gcp: GcpWalletConfiguration | null;
    circle: CircleCredential | null;
    legacyWalletType_removeInNextBreakingChange: WalletType;
  };
  contractSubscriptionsRequeryDelaySeconds: string;
  chainOverridesParsed: Chain[];
}
