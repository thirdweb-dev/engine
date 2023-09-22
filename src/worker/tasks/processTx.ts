import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { ethers } from "ethers";
import { BigNumber } from "ethers/lib/ethers";
import { TransactionStatusEnum } from "../../../server/schemas/transaction";
import { getSdk } from "../../../server/utils/cache/getSdk";
import { prisma } from "../../db/client";
import { getQueuedTxs } from "../../db/transactions/getQueuedTxs";
import { updateTx } from "../../db/transactions/updateTx";
import { getWalletNonce } from "../../db/wallets/getWalletNonce";
import { updateWalletNonce } from "../../db/wallets/updateWalletNonce";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";

export const processTx = async () => {
  try {
    // Everything happens in a transaction to lock for the duration of processing
    await prisma.$transaction(
      async (pgtx) => {
        // Select a batch of transactions and lock the rows
        const txs = await getQueuedTxs({ pgtx });

        if (txs.length < env.MIN_TRANSACTION_TO_PROCESS) {
          return;
        }

        // Transaction processing needs to happen sequentially for nonce management
        for (const tx of txs) {
          try {
            logger.worker.info(
              `[Transaction] [${tx.queueId}] Picked up by worker`,
            );

            // Update database that transaction has been picked up by worker
            await updateTx({
              pgtx,
              queueId: tx.queueId!,
              status: TransactionStatusEnum.Processed,
            });

            if (tx.accountAddress && tx.signerAddress) {
              // User operation processing
              const sdk = await getSdk({
                pgtx,
                chainId: tx.chainId!,
                walletAddress: tx.signerAddress,
                accountAddress: tx.accountAddress!,
              });
              const signer = sdk.getSigner() as ERC4337EthersSigner;

              // Should not be using initNonce
              const accountNonce = await signer.smartAccountAPI.getNonce();
              const dbNonce = await getWalletNonce({
                pgtx,
                address: tx.accountAddress!,
                chainId: tx.chainId!,
                initNonce: accountNonce.toNumber(),
              });

              const nonce = BigNumber.from(accountNonce).gt(
                BigNumber.from(dbNonce?.nonce || 0),
              )
                ? BigNumber.from(accountNonce)
                : BigNumber.from(dbNonce?.nonce || 0);

              try {
                const userOp = await signer.smartAccountAPI.createSignedUserOp(
                  {
                    target: tx.target || "",
                    data: tx.data || "0x",
                    value: tx.value ? BigNumber.from(tx.value) : undefined,
                    nonce,
                  },
                  false,
                );
                const userOpHash = await signer.smartAccountAPI.getUserOpHash(
                  userOp,
                );
                await signer.httpRpcClient.sendUserOpToBundler(userOp);

                // TODO: Need to update with other user op data
                await updateTx({
                  pgtx,
                  queueId: tx.queueId!,
                  status: TransactionStatusEnum.UserOpSent,
                  txData: {
                    userOpHash,
                  },
                });
              } catch (err: any) {
                logger.worker.warn(
                  `[User Operation] [${tx.queueId}] Failed to send with error - ${err}`,
                );

                await updateTx({
                  pgtx,
                  queueId: tx.queueId!,
                  status: TransactionStatusEnum.Errored,
                  txData: {
                    errorMessage:
                      err?.message ||
                      err?.toString() ||
                      `Failed to handle transaction`,
                  },
                });

                // TODO: If the transaction errors, we should move onto the next one
                continue;
              }

              await updateWalletNonce({
                pgtx,
                address: tx.accountAddress!,
                chainId: tx.chainId!,
                nonce: nonce.toNumber() + 1,
              });
            } else {
              // Standard transaction processing
              const sdk = await getSdk({
                pgtx,
                chainId: tx.chainId!,
                walletAddress: tx.fromAddress!,
              });

              // Run data gathering async calls in parallel
              const [mempoolNonce, dbNonce, gasOverrides] = await Promise.all([
                sdk.wallet.getNonce("pending"),
                getWalletNonce({
                  pgtx,
                  address: tx.fromAddress!,
                  chainId: tx.chainId!,
                }),
                getDefaultGasOverrides(sdk.getProvider()),
              ]);

              // As a backstop, take the greater value between the mempool nonce and db nonce (in case we get out of sync)
              const nonce = BigNumber.from(mempoolNonce).gt(
                BigNumber.from(dbNonce?.nonce || 0),
              )
                ? BigNumber.from(mempoolNonce)
                : BigNumber.from(dbNonce?.nonce || 0);

              let res: ethers.providers.TransactionResponse;
              try {
                res = await sdk.getSigner()!.sendTransaction({
                  to: tx.toAddress!,
                  from: tx.fromAddress!,
                  data: tx.data!,
                  value: tx.value!,
                  nonce,
                  ...gasOverrides,
                });
              } catch (err: any) {
                logger.worker.warn(
                  `[Transaction] [${tx.queueId}] Failed to send with error - ${err}`,
                );

                await updateTx({
                  pgtx,
                  queueId: tx.queueId!,
                  status: TransactionStatusEnum.Errored,
                  txData: {
                    errorMessage:
                      err?.message ||
                      err?.toString() ||
                      `Failed to handle transaction`,
                  },
                });

                // TODO: If the transaction errors, we should move onto the next one
                continue;
              }

              await updateTx({
                pgtx,
                queueId: tx.queueId!,
                status: TransactionStatusEnum.Submitted,
                res,
                txData: {
                  sentAtBlockNumber: await sdk.getProvider().getBlockNumber(),
                },
              });

              logger.worker.info(
                `[Transaction] [${tx.queueId}] Submitted with nonce '${nonce}' & hash '${res.hash}'`,
              );

              // Increment the nonce used for the transaction and update the database
              await updateWalletNonce({
                pgtx,
                address: tx.fromAddress!,
                chainId: tx.chainId!,
                nonce: nonce.toNumber() + 1,
              });
            }
          } catch (err) {
            logger.worker.warn(
              `[Transaction] [${tx.queueId}] Failed to process with error - ${err}`,
            );

            // TODO: Since this is an unknown error, it should be updated to unprocessed and retried if tx hasn't been sent.
            await updateTx({
              pgtx,
              queueId: tx.queueId!,
              status: TransactionStatusEnum.Errored,
              txData: {
                // TODO: Do we want more visibility on this error message? This case should rarely get hit.
                errorMessage: `Failed to process transaction.`,
              },
            });
          }
        }
      },
      {
        // Maximum 3 minutes to send the batch of transactions.
        // TODO: Should be dynamic with the batch size.
        timeout: 5 * 60000,
      },
    );
  } catch (err: any) {
    logger.worker.error(
      `Failed to process batch of transactions with error - ${err}`,
    );
  }
};
