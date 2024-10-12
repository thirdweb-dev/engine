import { defineChain, type Address } from "thirdweb";
import { smartWallet, type Account } from "thirdweb/wallets";
import { createWalletDetails } from "../../../db/wallets/createWalletDetails";
import { WalletType } from "../../../schema/wallet";
import { thirdwebClient } from "../../../utils/sdk";
import { splitAwsKmsArn } from "./awsKmsArn";
import {
  createAwsKmsKey,
  type CreateAwsKmsWalletParams,
} from "./createAwsKmsWallet";
import {
  createGcpKmsKey,
  type CreateGcpKmsWalletParams,
} from "./createGcpKmsWallet";
import { createLocalWallet } from "./createLocalWallet";
import { getAwsKmsAccount } from "./getAwsKmsAccount";
import { getGcpKmsAccount } from "./getGcpKmsAccount";

const getSmartWalletAddresses = async ({
  adminAccount,
  accountFactoryAddress,
}: {
  adminAccount: Account;
  accountFactoryAddress?: Address;
}) => {
  const smartAccount = smartWallet({
    chain: defineChain(1),
    sponsorGas: true,
    factoryAddress: accountFactoryAddress,
  });

  const connectedAccount = await smartAccount.connect({
    client: thirdwebClient,
    personalAccount: adminAccount,
  });

  return {
    accountAddress: connectedAccount.address,
    accountFactoryAddress,
  };
};

export type CreateSmartAwsWalletParams = CreateAwsKmsWalletParams & {
  accountFactoryAddress?: Address;
};

export const createSmartAwsWalletDetails = async ({
  label,
  accountFactoryAddress,
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

  const smartAccountAddress = await getSmartWalletAddresses({
    adminAccount,
    accountFactoryAddress,
  });

  return await createWalletDetails({
    type: WalletType.smartAwsKms,

    address: smartAccountAddress.accountAddress,
    accountFactoryAddress: smartAccountAddress.accountFactoryAddress,
    accountSignerAddress: adminAccount.address as Address,

    awsKmsArn: awsKmsWallet.awsKmsArn,
    awsKmsAccessKeyId: awsKmsWallet.params.awsAccessKeyId,
    awsKmsSecretAccessKey: awsKmsWallet.params.awsSecretAccessKey,
    label: label,
  });
};

export type CreateSmartGcpWalletParams = CreateGcpKmsWalletParams & {
  accountFactoryAddress?: Address;
};

export const createSmartGcpWalletDetails = async ({
  label,
  accountFactoryAddress,
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

  const smartAccountAddress = await getSmartWalletAddresses({
    adminAccount,
    accountFactoryAddress,
  });

  return await createWalletDetails({
    type: WalletType.smartGcpKms,
    address: smartAccountAddress.accountAddress,
    accountSignerAddress: adminAccount.address as Address,
    accountFactoryAddress: smartAccountAddress.accountFactoryAddress,
    gcpKmsResourcePath: gcpKmsWallet.resourcePath,
    gcpApplicationCredentialEmail:
      gcpKmsWallet.params.gcpApplicationCredentialEmail,
    gcpApplicationCredentialPrivateKey:
      gcpKmsWallet.params.gcpApplicationCredentialPrivateKey,
    label: label,
  });
};

export type CreateSmartLocalWalletParams = {
  label?: string;
  accountFactoryAddress?: Address;
};

export const createSmartLocalWalletDetails = async ({
  label,
  accountFactoryAddress,
}: CreateSmartLocalWalletParams) => {
  const { account, encryptedJson } = await createLocalWallet();

  const smartAccountAddress = await getSmartWalletAddresses({
    adminAccount: account,
    accountFactoryAddress,
  });

  return await createWalletDetails({
    type: WalletType.smartLocal,
    address: smartAccountAddress.accountAddress,
    accountSignerAddress: account.address as Address,
    accountFactoryAddress: smartAccountAddress.accountFactoryAddress,
    encryptedJson,
    label: label,
  });
};
