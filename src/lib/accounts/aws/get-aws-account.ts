import { ok, ResultAsync, safeTry } from "neverthrow";
import type { TypedData } from "ox";
import type { Address, Hex, ThirdwebClient } from "thirdweb";
import {
  eth_sendRawTransaction,
  getRpcClient,
  keccak256,
  serializeTransaction,
} from "thirdweb";

import type { Account } from "thirdweb/wallets";
import { hashTypedData, type SignableMessage } from "viem";
import { getChain } from "../../chain";
import type { AwsKmsErr, RpcErr } from "../../errors";
import type {
  SendTransactionOptions,
  SendTransactionResult,
  SignTransactionOptions,
} from "../transaction-types";
import { mapAwsError } from "./aws";
import { KmsSigner } from "aws-kms-signer";
import { hashMessage } from "thirdweb/utils";

export function getAwsKmsAccount({
  keyId,
  config,
  client,
}: {
  keyId: string;
  config: {
    region: string;
    credentials: {
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
  client: ThirdwebClient;
}): ResultAsync<Account, AwsKmsErr> {
  return safeTry(async function* () {
    const signer = new KmsSigner(keyId, config);

    // Get address
    const addressResult = yield* ResultAsync.fromPromise(
      signer.getAddress(),
      (error) =>
        mapAwsError(
          error,
          "address_retrieval_failed",
          "Failed to get address from KMS key",
        ),
    );

    const address = `0x${addressResult}` as Address;

    async function signTransaction(tx: SignTransactionOptions): Promise<Hex> {
      try {
        const serializedTx = serializeTransaction({ transaction: tx });
        const txHash = keccak256(serializedTx);
        const signature = await signer.sign(
          Buffer.from(txHash.slice(2), "hex"),
        );

        const r = `0x${signature.r.toString("hex")}` as Hex;
        const s = `0x${signature.s.toString("hex")}` as Hex;
        const v = BigInt(signature.v);
        const yParity: 0 | 1 = signature.v % 2 === 0 ? 1 : 0;

        return serializeTransaction({
          transaction: tx,
          signature: { r, s, v, yParity },
        });
      } catch (error) {
        throw mapAwsError(
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
        // signTransaction only throws a mapped AwsErr
        // biome-ignore lint/complexity/noUselessCatch: better for readability
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
        const signature = await signer.sign(
          Buffer.from(messageHash.slice(2), "hex"),
        );
        return `0x${signature.toString()}`;
      } catch (error) {
        throw mapAwsError(error, "signature_failed", "Could not sign message");
      }
    }

    async function signTypedData<
      const typedData extends TypedData.TypedData | Record<string, unknown>,
      primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(_typedData: TypedData.Definition<typedData, primaryType>): Promise<Hex> {
      try {
        // @ts-expect-error - this is a generic hash function
        const typedDataHash = hashTypedData(_typedData);
        const signature = await signer.sign(
          Buffer.from(typedDataHash.slice(2), "hex"),
        );
        return `0x${signature.toString()}`;
      } catch (error) {
        throw mapAwsError(
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
