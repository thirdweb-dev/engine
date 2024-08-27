import { type KMSClientConfig } from "@aws-sdk/client-kms";
import { KmsSigner } from "aws-kms-signer";
import type { Hex, ThirdwebClient } from "thirdweb";
import {
  eth_sendRawTransaction,
  getRpcClient,
  keccak256,
  type Address,
} from "thirdweb";
import { serializeTransaction } from "thirdweb/transaction";
import { toBytes } from "thirdweb/utils";
import { type Account } from "thirdweb/wallets";
import type {
  SignableMessage,
  TransactionSerializable,
  TypedData,
  TypedDataDefinition,
} from "viem";
import { hashTypedData } from "viem";
import { getChain } from "../../../utils/chain";

type SendTransactionResult = {
  transactionHash: Hex;
};

type SendTransactionOption = TransactionSerializable & {
  chainId: number;
};

type AwsKmsAccountOptions = {
  keyId: string;
  config?: KMSClientConfig;
  client: ThirdwebClient;
};

export async function getAwsKmsAccount(
  options: AwsKmsAccountOptions,
): Promise<Account> {
  const { keyId, config, client } = options;
  const signer = new KmsSigner(keyId, config);

  // Populate address immediately
  const addressUnprefixed = await signer.getAddress();
  const address = `0x${addressUnprefixed}` as Address;

  async function signTransaction(tx: TransactionSerializable): Promise<Hex> {
    const serializedTx = serializeTransaction({ transaction: tx });
    const txHash = keccak256(serializedTx);
    const signature = await signer.sign(Buffer.from(txHash.slice(2), "hex"));

    const r = `0x${signature.r.toString("hex")}` as Hex;
    const s = `0x${signature.s.toString("hex")}` as Hex;
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

    const signature = await signer.sign(
      Buffer.from(messageHash.slice(2), "hex"),
    );
    return `0x${signature.toString()}`;
  }

  async function signTypedData<
    const typedData extends TypedData | Record<string, unknown>,
    primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
  >(_typedData: TypedDataDefinition<typedData, primaryType>): Promise<Hex> {
    const typedDataHash = hashTypedData(_typedData);
    const signature = await signer.sign(
      Buffer.from(typedDataHash.slice(2), "hex"),
    );
    return `0x${signature.toString()}`;
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
  };
}
