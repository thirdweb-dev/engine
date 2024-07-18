import { Configuration } from "@prisma/client";
import { Chain } from "thirdweb";
import { WalletType } from "./wallet";

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
    | "contractSubscriptionsRetryDelaySeconds"
  > {
  walletConfiguration:
    | {
        type: WalletType.local;
      }
    | {
        type: WalletType.awsKms;
        awsAccessKeyId: string;
        awsSecretAccessKey: string;
        awsRegion: string;
      }
    | {
        type: WalletType.gcpKms;
        gcpApplicationProjectId: string;
        gcpKmsLocationId: string;
        gcpKmsKeyRingId: string;
        gcpApplicationCredentialEmail: string;
        gcpApplicationCredentialPrivateKey: string;
      };
  contractSubscriptionsRequeryDelaySeconds: string;
  chainOverridesParsed: Chain[];
}
