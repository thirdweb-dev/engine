export interface TabInput {
  aws: {
    awsAccessKey: string;
    awsSecretAccessKey: string;
    awsRegion: string;
  };
  gcp: {
    gcpAppCredentialPrivateKey: string;
    gcpProjectId: string;
    gcpKMSRingId: string;
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
