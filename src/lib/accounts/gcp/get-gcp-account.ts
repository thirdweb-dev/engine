import {
  eth_sendRawTransaction,
  getAddress,
  getRpcClient,
  keccak256,
  serializeTransaction,
  type Hex,
  type ThirdwebClient,
} from "thirdweb";
import type { Account } from "thirdweb/wallets";
import type { GcpKmsErr, RpcErr } from "../../errors";
import { ok, ResultAsync, safeTry } from "neverthrow";
import { CloudKmsSigner } from "@cloud-cryptographic-wallet/cloud-kms-signer";
import { mapGcpError } from "./gcp";
import type {
  SendTransactionOptions,
  SendTransactionResult,
  SignTransactionOptions,
} from "../transaction-types";
import { Bytes } from "@cloud-cryptographic-wallet/signer";
import { getChain } from "../../chain";
import { hashTypedData, type SignableMessage } from "viem";
import { hashMessage } from "thirdweb/utils";
import type { TypedData } from "ox";

export function getGcpKmsAccount({
  respourcePath: unprocessedName,
  clientOptions,
  client,
}: {
  respourcePath: string;
  clientOptions: {
    credentials: {
      client_email: string;
      private_key: string;
    };
  };
  client: ThirdwebClient;
}): ResultAsync<Account, GcpKmsErr> {
  return safeTry(async function* () {
    clientOptions.credentials.private_key =
      clientOptions.credentials.private_key.split(String.raw`\n`).join("\n");

    const resourcePath = unprocessedName.includes("cryptoKeyVersions")
      ? unprocessedName
      : unprocessedName.replace("cryptoKeysVersion", "cryptoKeyVersions");

    const signer = new CloudKmsSigner(resourcePath, clientOptions);

    // Get address
    const publicKey = yield* ResultAsync.fromPromise(
      signer.getPublicKey(),
      (error) =>
        mapGcpError(
          error,
          "address_retrieval_failed",
          "Failed to get public key",
        ),
    );

    const address = getAddress(publicKey.toAddress().toString());

    async function signTransaction(tx: SignTransactionOptions): Promise<Hex> {
      try {
        const serializedTx = serializeTransaction({ transaction: tx });
        const txHash = keccak256(serializedTx);
        const signature = await signer.sign(Bytes.fromString(txHash.slice(2)));

        const r = signature.r.toString() as Hex;
        const s = signature.s.toString() as Hex;
        const v = BigInt(signature.v);
        const yParity: 0 | 1 = signature.v % 2 === 0 ? 1 : 0;

        return serializeTransaction({
          transaction: tx,
          signature: { r, s, v, yParity },
        });
      } catch (error) {
        throw mapGcpError(
          error,
          "signature_failed",
          "Could not sign transaction",
        );
      }
    }

    async function sendTransaction(
      tx: SendTransactionOptions,
    ): SendTransactionResult {
      let signature: Hex;
      try {
        signature = await signTransaction(tx);
      } catch (error) {
        // signTransaction only throws a gcpErr, safe to throw
        // biome-ignore lint/complexity/noUselessCatch: readability
        throw error;
      }

      const rpcRequest = getRpcClient({
        client: client,
        chain: await getChain(tx.chainId),
      });

      try {
        const transactionHash = await eth_sendRawTransaction(
          rpcRequest,
          signature,
        );
        return { transactionHash };
      } catch (error) {
        throw {
          kind: "rpc",
          code: "send_transaction_failed",
          status: 500,
          message:
            error instanceof Error ? error.message : "RPC request failed",
          source: error instanceof Error ? error : undefined,
        } as RpcErr;
      }
    }

    async function signMessage({
      message,
    }: {
      message: SignableMessage;
    }): Promise<Hex> {
      try {
        const messageHash = hashMessage(message);
        const signature = await signer.sign(Bytes.fromString(messageHash));
        return signature.bytes.toString() as Hex;
      } catch (error) {
        throw mapGcpError(error, "signature_failed", "Could not sign message");
      }
    }

    async function signTypedData<
      const typedData extends TypedData.TypedData | Record<string, unknown>,
      primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(_typedData: TypedData.Definition<typedData, primaryType>): Promise<Hex> {
      try {
        // @ts-expect-error - mapping to generic hashTypedData
        const typedDataHash = hashTypedData(_typedData);
        const signature = await signer.sign(Bytes.fromString(typedDataHash));
        return signature.bytes.toString() as Hex;
      } catch (error) {
        throw mapGcpError(
          error,
          "signature_failed",
          "Could not sign typed data",
        );
      }
    }

    return ok({
      address,
      sendTransaction,
      signMessage,
      signTypedData,
      signTransaction,
    } satisfies Account);
  });
}
