import { errAsync, okAsync, ResultAsync } from "neverthrow";
import type { Account } from "thirdweb/wallets";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { mapCircleError } from "./circle.js";
import {
  eth_sendRawTransaction,
  getRpcClient,
  serializeTransaction,
  type Address,
  type Hex,
  type ThirdwebClient,
} from "thirdweb";

import { parseSignature, type SignableMessage } from "viem";
import { stringify, toHex } from "thirdweb/utils";

import type { CircleErr, RpcErr } from "../../errors.js";
import type {
  SendTransactionOptions,
  SendTransactionResult,
  SignTransactionOptions,
} from "../transaction-types.js";
import type { TypedData } from "ox";
import { getChain } from "../../chain.js";

export function getCircleAccount({
  walletId,
  apiKey,
  entitySecret,
  client,
}: {
  walletId: string;
  apiKey: string;
  entitySecret: string;
  client: ThirdwebClient;
}): ResultAsync<Account, CircleErr> {
  const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  // Initial wallet setup using ResultAsync
  return ResultAsync.fromPromise(
    circleDeveloperSdk.getWallet({ id: walletId }),
    (error) =>
      mapCircleError(
        error,
        "wallet_retrieval_failed",
        `Could not get wallet with id:${walletId}`,
      ),
  ).andThen((walletResponse) => {
    const wallet = walletResponse.data?.wallet;
    if (!wallet) {
      return errAsync({
        kind: "circle",
        code: "wallet_retrieval_failed",
        status: 500,
        message: `Unable to get circle wallet with id:${walletId}`,
      } as CircleErr);
    }

    const address = wallet.address as Address;

    // Account methods that throw CircleErr
    async function signTransaction(tx: SignTransactionOptions): Promise<Hex> {
      try {
        const signature = await circleDeveloperSdk.signTransaction({
          walletId,
          transaction: stringify(tx),
        });

        if (!signature.data?.signature) {
          throw {
            kind: "circle",
            code: "signature_failed",
            status: 500,
            message: "Unable to sign transaction",
          } as CircleErr;
        }

        return signature.data.signature as Hex;
      } catch (error) {
        throw mapCircleError(
          error,
          "signature_failed",
          "Could not get transaction signature",
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
        // signTransaction already returns CircleErr
        // biome-ignore lint/complexity/noUselessCatch: better for readability
        throw error;
      }

      const rpcRequest = getRpcClient({
        client: client,
        chain: getChain(tx.chainId),
      });

      const splittedSignature = parseSignature(signature);
      const signedTransaction = serializeTransaction({
        transaction: tx,
        signature: splittedSignature,
      });

      try {
        const transactionHash = await eth_sendRawTransaction(
          rpcRequest,
          signedTransaction,
        );
        return { transactionHash };
      } catch (error) {
        throw {
          kind: "rpc",
          code: "send_transaction_failed",
          status: 500,
          message:
            error instanceof Error
              ? error.message
              : `RPC request failed from Circle Account on chain ${tx}`,
          source: error instanceof Error ? error : undefined,
        } as RpcErr;
      }
    }

    async function signTypedData<
      const typedData extends TypedData.TypedData | Record<string, unknown>,
      primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(_typedData: TypedData.Definition<typedData, primaryType>): Promise<Hex> {
      try {
        const signatureResponse = await circleDeveloperSdk.signTypedData({
          data: stringify(_typedData),
          walletId,
        });

        if (!signatureResponse.data?.signature) {
          throw {
            kind: "circle",
            code: "signature_failed",
            status: 500,
            message: "Could not sign typed data",
          } as CircleErr;
        }

        return signatureResponse.data.signature as Hex;
      } catch (error) {
        throw mapCircleError(
          error,
          "signature_failed",
          "Could not get signature for typed data",
        );
      }
    }

    async function signMessage({
      message,
    }: {
      message: SignableMessage;
    }): Promise<Hex> {
      try {
        const isRawMessage = typeof message === "object" && "raw" in message;
        let messageToSign = isRawMessage ? message.raw : message;

        if (typeof messageToSign !== "string") {
          messageToSign = toHex(messageToSign);
        }

        const signatureResponse = await circleDeveloperSdk.signMessage({
          walletId,
          message: messageToSign,
          encodedByHex: isRawMessage,
        });

        if (!signatureResponse.data?.signature) {
          throw {
            kind: "circle",
            code: "signature_failed",
            status: 500,
            message: "Could not get signature",
          } as CircleErr;
        }

        return signatureResponse.data.signature as Hex;
      } catch (error) {
        throw mapCircleError(
          error,
          "signature_failed",
          "Could not get message signature",
        );
      }
    }

    // Return the Account implementation
    return okAsync({
      address,
      sendTransaction,
      signMessage,
      signTypedData: signTypedData as Account["signTypedData"],
      signTransaction,
    } satisfies Account);
  });
}
