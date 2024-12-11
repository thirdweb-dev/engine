import { defineChain, type Address, type Chain } from "thirdweb";
import { smartWallet, type Account } from "thirdweb/wallets";
import { createWalletDetails } from "../../../shared/db/wallets/create-wallet-details";
import { WalletType } from "../../../shared/schemas/wallet";
import { thirdwebClient } from "../../../shared/utils/sdk";
import { splitAwsKmsArn } from "./aws-kms-arn";
import {
  createAwsKmsKey,
  type CreateAwsKmsWalletParams,
} from "./create-aws-kms-wallet";
import {
  createGcpKmsKey,
  type CreateGcpKmsWalletParams,
} from "./create-gcp-kms-wallet";
import { generateLocalWallet } from "./create-local-wallet";
import { getAwsKmsAccount } from "./get-aws-kms-account";
import { getGcpKmsAccount } from "./get-gcp-kms-account";
import { env } from "../../../shared/utils/env";

/**
 * Get a smart wallet address for a given admin account
 * Optionally specify the account factory address, and entrypoint address
 * If no network is specified, it will default to ethereum mainnet
 */
export const getConnectedSmartWallet = async ({
  adminAccount,
  accountFactoryAddress,
  entrypointAddress,
  chain,
}: {
  adminAccount: Account;
  accountFactoryAddress?: Address;
  entrypointAddress?: Address;
  chain?: Chain;
}) => {
  const smartAccount = smartWallet({
    chain: chain ?? defineChain(1),
    sponsorGas: true,
    factoryAddress: accountFactoryAddress,
    overrides: {
      entrypointAddress,
    },
  });

  return await smartAccount.connect({
    client: thirdwebClient,
    personalAccount: adminAccount,
  });
};

type CreateSmartAwsWalletParams = CreateAwsKmsWalletParams & {
  accountFactoryAddress?: Address;
  entrypointAddress?: Address;
};

export const createSmartAwsWalletDetails = async ({
  label,
  accountFactoryAddress,
  entrypointAddress,
  ...awsKmsWalletParams
}: CreateSmartAwsWalletParams) => {
  const awsKmsWallet = await createAwsKmsKey(awsKmsWalletParams);

  const { keyId } = splitAwsKmsArn(awsKmsWallet.awsKmsArn);

  const adminAccount = await getAwsKmsAccount({
    client: thirdwebClient,
    keyId,
    config: {
      region: awsKmsWallet.params.awsRegion,
      credentials: {
        accessKeyId: awsKmsWallet.params.awsAccessKeyId,
        secretAccessKey: awsKmsWallet.params.awsSecretAccessKey,
      },
    },
  });

  const smartWallet = await getConnectedSmartWallet({
    adminAccount,
    accountFactoryAddress,
    entrypointAddress,
  });

  return await createWalletDetails({
    type: WalletType.smartAwsKms,

    address: smartWallet.address,
    accountFactoryAddress,
    entrypointAddress,
    accountSignerAddress: adminAccount.address as Address,

    awsKmsArn: awsKmsWallet.awsKmsArn,
    awsKmsAccessKeyId: awsKmsWallet.params.awsAccessKeyId,
    awsKmsSecretAccessKey: awsKmsWallet.params.awsSecretAccessKey,
    label: label,
  });
};

type CreateSmartGcpWalletParams = CreateGcpKmsWalletParams & {
  accountFactoryAddress?: Address;
  entrypointAddress?: Address;
};

export const createSmartGcpWalletDetails = async ({
  label,
  accountFactoryAddress,
  entrypointAddress,
  ...gcpKmsWalletParams
}: CreateSmartGcpWalletParams) => {
  const gcpKmsWallet = await createGcpKmsKey(gcpKmsWalletParams);

  const adminAccount = await getGcpKmsAccount({
    client: thirdwebClient,
    name: gcpKmsWallet.resourcePath,
    clientOptions: {
      credentials: {
        private_key: gcpKmsWallet.params.gcpApplicationCredentialPrivateKey,
        client_email: gcpKmsWallet.params.gcpApplicationCredentialEmail,
      },
    },
  });

  const smartWallet = await getConnectedSmartWallet({
    adminAccount,
    accountFactoryAddress,
    entrypointAddress,
  });

  return await createWalletDetails({
    type: WalletType.smartGcpKms,
    address: smartWallet.address,
    accountSignerAddress: adminAccount.address as Address,
    accountFactoryAddress,
    entrypointAddress,
    gcpKmsResourcePath: gcpKmsWallet.resourcePath,
    gcpApplicationCredentialEmail:
      gcpKmsWallet.params.gcpApplicationCredentialEmail,
    gcpApplicationCredentialPrivateKey:
      gcpKmsWallet.params.gcpApplicationCredentialPrivateKey,
    label: label,
  });
};

type CreateSmartLocalWalletParams = {
  label?: string;
  accountFactoryAddress?: Address;
  entrypointAddress?: Address;
  encryptionPassword?: string;
};

export const createSmartLocalWalletDetails = async ({
  label,
  accountFactoryAddress,
  entrypointAddress,
  encryptionPassword = env.ENCRYPTION_PASSWORD,
}: CreateSmartLocalWalletParams) => {
  const { account, encryptedJson } =
    await generateLocalWallet(encryptionPassword);

  const wallet = await getConnectedSmartWallet({
    adminAccount: account,
    accountFactoryAddress,
    entrypointAddress,
  });

  return await createWalletDetails({
    type: WalletType.smartLocal,
    address: wallet.address,
    accountSignerAddress: account.address as Address,
    accountFactoryAddress,
    entrypointAddress,
    encryptedJson,
    label: label,
  });
};
