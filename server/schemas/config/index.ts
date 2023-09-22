import { Type } from "@sinclair/typebox";

export const EngineConfigSchema = Type.Object({
  aws: Type.Optional(
    Type.Object({
      awsAccessKey: Type.String({
        description: "AWS Access Key",
      }),
      awsSecretAccessKey: Type.String({
        description: "AWS Secret Access Key",
      }),
      awsRegion: Type.String({
        description: "AWS Region",
      }),
    }),
  ),
  gcp: Type.Optional(
    Type.Object({
      gcpAppCredentialPrivateKey: Type.String({
        description: "Google Application Credential Private Key",
      }),
      gcpProjectId: Type.String({
        description: "Google Application Project ID",
      }),
      gcpKmsRingId: Type.String({
        description: "Google KMS Key Ring ID",
      }),
      gcpLocationId: Type.String({
        description: "Google KMS Location ID",
      }),
      gcpAppCredentialEmail: Type.String({
        description: "Google Application Credential Email",
      }),
    }),
  ),
  local: Type.Optional(
    Type.Object({
      privateKey: Type.Optional(
        Type.String({
          description: "Private Key",
        }),
      ),
      mnemonic: Type.Optional(
        Type.String({
          description: "Mnemonic",
        }),
      ),
      encryptedJson: Type.Optional(
        Type.String({
          description: "Encrypted JSON",
        }),
      ),
      password: Type.Optional(
        Type.String({
          description: "Password",
        }),
      ),
    }),
  ),
});

export interface AWSConfig {
  awsAccessKey: string;
  awsAccessKeyIV: string;
  awsAccessKeyAuthTag: string;

  awsSecretAccessKey: string;
  awsSecretAccessKeyIV: string;
  awsSecretAccessKeyAuthTag: string;

  awsRegion: string;
  awsRegionIV: string;
  awsRegionAuthTag: string;
}

export interface GCPConfig {
  gcpAppCredentialPrivateKey: string;
  gcpAppCredentialPrivateKeyIV: string;
  gcpAppCredentialPrivateKeyAuthTag: string;

  gcpProjectId: string;
  gcpProjectIdIV: string;
  gcpProjectIdAuthTag: string;

  gcpKmsRingId: string;
  gcpKmsRingIdIV: string;
  gcpKmsRingIdAuthTag: string;

  gcpLocationId: string;
  gcpLocationIdIV: string;
  gcpLocationIdAuthTag: string;

  gcpAppCredentialEmail: string;
  gcpAppCredentialEmailIV: string;
  gcpAppCredentialEmailAuthTag: string;
}

export interface LocalConfig {
  privateKey?: string;
  mnemonic?: string;
  encryptedJson?: string;
  password?: string;
}

export interface EncryptionConfig {
  iv: string;
  authTag: string;
  encryptedData: string;
}
