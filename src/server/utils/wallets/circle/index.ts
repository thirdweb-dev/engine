import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { getWalletCredential } from "../../../../shared/db/wallet-credentials/get-wallet-credential";
import {
  type Address,
  eth_sendRawTransaction,
  getRpcClient,
  type Hex,
  serializeTransaction,
  type ThirdwebClient,
  toHex,
  type toSerializableTransaction,
} from "thirdweb";
import { getChain } from "../../../../shared/utils/chain";
import {
  parseSignature,
  type SignableMessage,
  type TypedData,
  type TypedDataDefinition,
} from "viem";
import type { Account } from "thirdweb/wallets";
import { thirdwebClient } from "../../../../shared/utils/sdk";
import { prisma } from "../../../../shared/db/client";
import { getConnectedSmartWallet } from "../create-smart-wallet";
import {
  DEFAULT_ACCOUNT_FACTORY_V0_7,
  ENTRYPOINT_ADDRESS_v0_7,
} from "thirdweb/wallets/smart";
import { stringify } from "thirdweb/utils";

export class CircleWalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircleWalletError";
  }
}

export async function provisionCircleWallet({
  entitySecret,
  apiKey,
  walletSetId,
  client,
  isTestnet,
}: {
  entitySecret: string;
  apiKey: string;
  walletSetId?: string;
  client: ThirdwebClient;
  isTestnet?: boolean;
}) {
  const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
    apiKey: apiKey,
    entitySecret: entitySecret,
  });

  if (!walletSetId) {
    const walletSet = await circleDeveloperSdk
      .createWalletSet({
        name: `Engine WalletSet ${new Date().toISOString()}`,
      })
      .catch((e) => {
        throw new CircleWalletError(
          `[Circle] Could not create walletset:\n${JSON.stringify(
            e?.response?.data,
          )}`,
        );
      });

    walletSetId = walletSet.data?.walletSet.id;
    if (!walletSetId)
      throw new CircleWalletError(
        "Did not receive walletSetId, and failed to create one automatically",
      );
  }

  const provisionWalletResponse = await circleDeveloperSdk
    .createWallets({
      accountType: "EOA",
      blockchains: [isTestnet ? "EVM-TESTNET" : "EVM"],
      count: 1,
      walletSetId: walletSetId,
    })
    .catch((e) => {
      throw new CircleWalletError(
        `[Circle] Could not provision wallet:\n${JSON.stringify(
          e?.response?.data,
        )}`,
      );
    });

  const provisionedWallet = provisionWalletResponse.data?.wallets?.[0];

  if (!provisionedWallet)
    throw new CircleWalletError("Did not receive provisioned wallet");

  const circleAccount = await getCircleAccount({
    walletId: provisionedWallet.id,
    apiKey: apiKey,
    entitySecret: entitySecret,
    client,
  });

  return {
    walletSetId,
    provisionedWallet: provisionedWallet,
    account: circleAccount,
  };
}

type SerializableTransaction = Awaited<
  ReturnType<typeof toSerializableTransaction>
>;

type SendTransactionOptions = SerializableTransaction & {
  chainId: number;
};

type SendTransactionResult = {
  transactionHash: Hex;
};

type CircleAccount = Account;

export async function getCircleAccount({
  walletId,
  apiKey,
  entitySecret,
  client,
}: {
  walletId: string;
  apiKey: string;
  entitySecret: string;
  client: ThirdwebClient;
}) {
  const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  const walletResponse = await circleDeveloperSdk
    .getWallet({ id: walletId })
    .catch((e) => {
      throw new CircleWalletError(
        `[Circle] Could not get wallet with id:${walletId}:\n${JSON.stringify(
          e?.response?.data,
        )}`,
      );
    });

  if (!walletResponse) {
    throw new CircleWalletError(
      `Unable to get circle wallet with id:${walletId}`,
    );
  }
  const wallet = walletResponse.data?.wallet;
  const address = wallet?.address as Address;

  async function signTransaction(tx: SerializableTransaction) {
    const signature = await circleDeveloperSdk
      .signTransaction({
        walletId,
        transaction: stringify(tx),
      })
      .catch((e) => {
        throw new CircleWalletError(
          `[Circle] Could not get transaction signature:\n${JSON.stringify(
            e?.response?.data,
          )}`,
        );
      });

    if (!signature.data?.signature) {
      throw new CircleWalletError("Unable to sign transaction");
    }

    return signature.data.signature as Hex;
  }

  async function sendTransaction(
    tx: SendTransactionOptions,
  ): Promise<SendTransactionResult> {
    const rpcRequest = getRpcClient({
      client: client,
      chain: await getChain(tx.chainId),
    });

    const signature = await signTransaction(tx);
    const splittedSignature = parseSignature(signature);

    const signedTransaction = serializeTransaction({
      transaction: tx,
      signature: splittedSignature,
    });

    const transactionHash = await eth_sendRawTransaction(
      rpcRequest,
      signedTransaction,
    );
    return { transactionHash };
  }

  async function signTypedData<
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
  >(_typedData: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
    const signatureResponse = await circleDeveloperSdk
      .signTypedData({
        data: stringify(_typedData),
        walletId,
      })
      .catch((e) => {
        throw new CircleWalletError(
          `[Circle] Could not get signature:\n${JSON.stringify(
            e?.response?.data,
          )}`,
        );
      });

    if (!signatureResponse.data?.signature) {
      throw new CircleWalletError("Could not sign typed data");
    }

    return signatureResponse.data?.signature as Hex;
  }

  async function signMessage({
    message,
  }: {
    message: SignableMessage;
  }): Promise<Hex> {
    const isRawMessage = typeof message === "object" && "raw" in message;
    let messageToSign = isRawMessage ? message.raw : message;

    if (typeof messageToSign !== "string") {
      messageToSign = toHex(messageToSign);
    }

    const signatureResponse = await circleDeveloperSdk
      .signMessage({
        walletId,
        message: messageToSign,
        encodedByHex: isRawMessage,
      })
      .catch((e) => {
        throw new CircleWalletError(
          `[Circle] Could not get signature:\n${JSON.stringify(
            e?.response?.data,
          )}`,
        );
      });

    if (!signatureResponse.data?.signature)
      throw new CircleWalletError("Could not get signature");
    return signatureResponse.data?.signature as Hex;
  }

  return {
    address,
    sendTransaction,
    signMessage,
    signTypedData,
    signTransaction,
  } as CircleAccount satisfies Account;
}

export async function createCircleWalletDetails({
  credentialId,
  walletSetId,
  label,
  isSmart,
  isTestnet,
}: {
  credentialId: string;
  walletSetId?: string;
  label?: string;
  isSmart: boolean;
  isTestnet?: boolean;
}) {
  const {
    walletConfiguration: { circle },
  } = await getConfig();

  if (!circle) {
    throw new CircleWalletError(
      "Circle wallet configuration not found. Please check your configuration.",
    );
  }

  const credential = await getWalletCredential({
    id: credentialId,
  });

  if (credential.type !== "circle") {
    throw new CircleWalletError(
      `Invalid Credential: not valid type, expected circle received ${credential.type}`,
    );
  }

  const provisionedDetails = await provisionCircleWallet({
    entitySecret: credential.data.entitySecret,
    apiKey: circle.apiKey,
    client: thirdwebClient,
    walletSetId,
    isTestnet,
  });

  let address = provisionedDetails.account.address;

  const sbwDetails = {
    accountFactoryAddress: DEFAULT_ACCOUNT_FACTORY_V0_7,
    entrypointAddress: ENTRYPOINT_ADDRESS_v0_7,
    accountSignerAddress: address,
  } as const;

  if (isSmart) {
    const smartAccount = await getConnectedSmartWallet({
      adminAccount: provisionedDetails.account,
      ...sbwDetails,
    });

    address = smartAccount.address;
  }

  return await prisma.walletDetails.create({
    data: {
      address: address.toLowerCase(),
      type: isSmart ? "smart:circle" : "circle",
      label: label,
      credentialId,
      platformIdentifiers: {
        circleWalletId: provisionedDetails.provisionedWallet.id,
        walletSetId: provisionedDetails.walletSetId,
        isTestnet: isTestnet ?? false,
      },
      ...(isSmart ? sbwDetails : {}),
    },
  });
}
