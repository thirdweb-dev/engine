const CANCEL_DEADLINE_MS = 1000 * 60 * 60; // 1 hour

export const updateMinedUserOps = async () => {
  // try {
  //   const sendWebhookForQueueIds: TransactionWebhookData[] = [];
  //   const reportUsageForQueueIds: ReportUsageParams[] = [];
  //   await prisma.$transaction(
  //     async (pgtx) => {
  //       const userOps = await getSentUserOps({ pgtx });
  //       if (userOps.length === 0) {
  //         return;
  //       }
  //       const promises = userOps.map(async (userOp) => {
  //         try {
  //           if (
  //             !userOp.sentAt ||
  //             !userOp.signerAddress ||
  //             !userOp.accountAddress ||
  //             !userOp.userOpHash
  //           ) {
  //             return;
  //           }
  //           const sdk = await getSdk({
  //             chainId: parseInt(userOp.chainId),
  //             walletAddress: userOp.signerAddress,
  //             accountAddress: userOp.accountAddress,
  //           });
  //           const signer = sdk.getSigner() as ERC4337EthersSigner;
  //           let userOpReceipt: providers.TransactionReceipt | undefined;
  //           try {
  //             // Get userOp receipt.
  //             // If no receipt, try again later (or cancel userOps after 1 hour).
  //             // Else the transaction call was submitted to mempool.
  //             userOpReceipt = await signer.smartAccountAPI.getUserOpReceipt(
  //               signer.httpRpcClient,
  //               userOp.userOpHash,
  //               3_000, // 3 seconds
  //             );
  //           } catch (error) {
  //             // Exception is thrown when userOp is not found/null
  //             logger({
  //               service: "worker",
  //               level: "error",
  //               queueId: userOp.id,
  //               message: "Failed to get receipt for UserOp",
  //               error,
  //             });
  //           }
  //           if (!userOpReceipt) {
  //             if (msSince(userOp.sentAt) > CANCEL_DEADLINE_MS) {
  //               await updateTx({
  //                 pgtx,
  //                 queueId: userOp.id,
  //                 data: {
  //                   status: TransactionStatus.Errored,
  //                   errorMessage: "Transaction timed out.",
  //                 },
  //               });
  //             }
  //             return;
  //           }
  //           const chain = defineChain(parseInt(userOp.chainId));
  //           const rpcRequest = getRpcClient({
  //             client: thirdwebClient,
  //             chain,
  //           });
  //           // Get the transaction receipt.
  //           // If no receipt, try again later.
  //           // Else the transaction call was confirmed onchain.
  //           const transaction = await eth_getTransactionByHash(rpcRequest, {
  //             hash: userOpReceipt.transactionHash as `0x${string}`,
  //           });
  //           const transactionReceipt = await eth_getTransactionReceipt(
  //             rpcRequest,
  //             { hash: transaction.hash },
  //           );
  //           if (!transactionReceipt) {
  //             // If no receipt, try again later.
  //             return;
  //           }
  //           let minedAt = new Date();
  //           try {
  //             const block = await eth_getBlockByNumber(rpcRequest, {
  //               blockNumber: transactionReceipt.blockNumber,
  //               includeTransactions: false,
  //             });
  //             minedAt = new Date(Number(block.timestamp) * 1000);
  //           } catch (e) {}
  //           // Update the userOp transaction as mined.
  //           await updateTx({
  //             pgtx,
  //             queueId: userOp.id,
  //             data: {
  //               status: TransactionStatus.Mined,
  //               minedAt,
  //               blockNumber: Number(transactionReceipt.blockNumber),
  //               onChainTxStatus: toTransactionStatus(transactionReceipt.status),
  //               transactionHash: transactionReceipt.transactionHash,
  //               transactionType: toTransactionType(transaction.type),
  //               gasLimit: userOp.gasLimit ?? undefined,
  //               maxFeePerGas: transaction.maxFeePerGas?.toString(),
  //               maxPriorityFeePerGas:
  //                 transaction.maxPriorityFeePerGas?.toString(),
  //               gasPrice: transaction.gasPrice?.toString(),
  //             },
  //           });
  //           logger({
  //             service: "worker",
  //             level: "info",
  //             queueId: userOp.id,
  //             message: "Updated with receipt",
  //           });
  //           sendWebhookForQueueIds.push({
  //             queueId: userOp.id,
  //             status: TransactionStatus.Mined,
  //           });
  //           reportUsageForQueueIds.push({
  //             input: {
  //               fromAddress: userOp.fromAddress ?? undefined,
  //               toAddress: userOp.toAddress ?? undefined,
  //               value: userOp.value ?? undefined,
  //               chainId: userOp.chainId,
  //               userOpHash: userOp.userOpHash ?? undefined,
  //               onChainTxStatus: toTransactionStatus(transactionReceipt.status),
  //               functionName: userOp.functionName ?? undefined,
  //               extension: userOp.extension ?? undefined,
  //               provider: signer.httpRpcClient.bundlerUrl,
  //               msSinceSend: msSince(userOp.sentAt!),
  //             },
  //             action: UsageEventType.MineTx,
  //           });
  //         } catch (err) {
  //           logger({
  //             service: "worker",
  //             level: "error",
  //             queueId: userOp.id,
  //             message: "Failed to update receipt for UserOp ",
  //             error: err,
  //           });
  //         }
  //       });
  //       await Promise.all(promises);
  //     },
  //     {
  //       timeout: 5 * 60 * 1000, // 5 minutes
  //     },
  //   );
  //   await enqueueTransactionWebhooks(sendWebhookForQueueIds);
  //   reportUsage(reportUsageForQueueIds);
  // } catch (err) {
  //   logger({
  //     service: "worker",
  //     level: "error",
  //     message: "Failed to batch update receipts",
  //     error: err,
  //   });
  // }
};
