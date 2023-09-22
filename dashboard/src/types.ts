export interface TabInput {
  awsKms: {
    awsAccessKey: string;
    awsSecretAccessKey: string;
    awsRegion: string;
  };
  gcpKms: {
    gcpAppCredentialPrivateKey: string;
    gcpProjectId: string;
    gcpKmsRingId: string;
    gcpLocationId: string;
    gcpAppCredentialEmail: string;
  };
  local: {
    privateKey: string;
    mnemonic: string;
    encryptedJson: string;
    password: string;
  };
}

export enum WalletType {
  awsKms = "aws-kms",
  gcpKms = "gcp-kms",
  local = "local",
}

export interface ConfigData {
  configType?: string;
  awsAccessKey?: string;
  awsSecretAccessKey?: string;
  awsRegion?: string;
  gcpAppCredentialEmail?: string;
  gcpAppCredentialPrivateKey?: string;
  gcpKmsRingId?: string;
  gcpLocationId?: string;
  gcpProjectId?: string;
  privateKey?: string;
  mnemonic?: string;
  encryptedJson?: string;
  password?: string;
}
