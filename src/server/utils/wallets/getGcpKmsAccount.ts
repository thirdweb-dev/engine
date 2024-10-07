import { CloudKmsSigner } from "@cloud-cryptographic-wallet/cloud-kms-signer";
import { Bytes } from "@cloud-cryptographic-wallet/signer";
import type { Hex, ThirdwebClient } from "thirdweb";
import {
  eth_sendRawTransaction,
  getAddress,
  getRpcClient,
  keccak256,
} from "thirdweb";
import { serializeTransaction } from "thirdweb/transaction";
import { toBytes } from "thirdweb/utils";
import type { Account } from "thirdweb/wallets";
import type {
  SignableMessage,
  TransactionSerializable,
  TypedData,
  TypedDataDefinition,
} from "viem";
import { hashTypedData } from "viem";
import { getChain } from "../../../utils/chain"; // Adjust import path as needed

type SendTransactionResult = {
  transactionHash: Hex;
};

type SendTransactionOption = TransactionSerializable & {
  chainId: number;
};

type GcpKmsAccountOptions = {
  name: string; // GCP KMS key name
  clientOptions?: ConstructorParameters<typeof CloudKmsSigner>[1];
  client: ThirdwebClient;
};

type GcpKmsAccount = Account;

export async function getGcpKmsAccount(
  options: GcpKmsAccountOptions,
): Promise<GcpKmsAccount> {
  const { name: unprocessedName, clientOptions, client } = options;

  let rawPrivateKey: string | undefined;
  if (clientOptions?.credentials) {
    if ("private_key" in clientOptions.credentials) {
      rawPrivateKey = clientOptions.credentials.private_key;
    }
  }

  // we had a bug previously where we previously called it "cryptoKeyVersion" instead of "cryptoKeyVersions"
  // if we detect that, we'll fix it here
  // TODO: remove this as a breaking change
  const name = unprocessedName.includes("cryptoKeyVersions")
    ? unprocessedName
    : unprocessedName.replace("cryptoKeyVersion", "cryptoKeyVersions");

  const signer = new CloudKmsSigner(name, {
    ...clientOptions,
    credentials: {
      ...clientOptions?.credentials,
      // https://stackoverflow.com/questions/74131595/error-error1e08010cdecoder-routinesunsupported-with-google-auth-library
      private_key: rawPrivateKey?.split(String.raw`\n`).join("\n"),
    },
  });

  // Populate address immediately
  const publicKey = await signer.getPublicKey();
  const address = getAddress(publicKey.toAddress().toString());

  async function signTransaction(tx: TransactionSerializable): Promise<Hex> {
    const serializedTx = serializeTransaction({ transaction: tx });
    const txHash = keccak256(serializedTx);
    const signature = await signer.sign(Bytes.fromString(txHash.slice(2)));

    const r = signature.r.toString() as Hex;
    const s = signature.s.toString() as Hex;
    const v = signature.v;

    const yParity = v % 2 === 0 ? 1 : (0 as 0 | 1);

    const signedTx = serializeTransaction({
      transaction: tx,
      signature: {
        r,
        s,
        yParity,
      },
    });

    return signedTx;
  }

  /**
   * Sign a message with the account's private key.
   * If the message is a string, it will be prefixed with the Ethereum message prefix.
   * If the message is an object with a `raw` property, it will be signed as-is.
   */
  async function signMessage({
    message,
  }: {
    message: SignableMessage;
  }): Promise<Hex> {
    let messageHash: Hex;
    if (typeof message === "string") {
      const prefixedMessage = `\x19Ethereum Signed Message:\n${message.length}${message}`;
      messageHash = keccak256(toBytes(prefixedMessage));
    } else if ("raw" in message) {
      messageHash = keccak256(message.raw);
    } else {
      throw new Error("Invalid message format");
    }

    const signature = await signer.sign(Bytes.fromString(messageHash));
    return signature.bytes.toString() as Hex;
  }

  async function signTypedData<
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
  >(_typedData: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
    const typedDataHash = hashTypedData(_typedData);
    const signature = await signer.sign(Bytes.fromString(typedDataHash));
    return signature.bytes.toString() as Hex;
  }

  async function sendTransaction(
    tx: SendTransactionOption,
  ): Promise<SendTransactionResult> {
    const rpcRequest = getRpcClient({
      client: client,
      chain: await getChain(tx.chainId),
    });

    const signedTx = await signTransaction(tx);

    const transactionHash = await eth_sendRawTransaction(rpcRequest, signedTx);
    return { transactionHash };
  }

  return {
    address,
    sendTransaction,
    signMessage,
    signTypedData,
    signTransaction,
  } satisfies Account;
}
