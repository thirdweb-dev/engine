import type { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { BigNumber } from "ethers";
import type { ContractExtension } from "../../schema/extension";
import { queueTxRaw } from "./queueTxRaw";
import { logger } from "../../utils/logger";

interface QueueTxParams {
  tx: Transaction<any> | DeployTransaction;
  chainId: number;
  extension: ContractExtension;
  // TODO: These shouldn't be in here
  deployedContractAddress?: string;
  deployedContractType?: string;
  simulateTx?: boolean;
  idempotencyKey?: string;
  txOverrides?: {
    gas?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
}

export const queueTx = async ({
  tx,
  chainId,
  extension,
  deployedContractAddress,
  deployedContractType,
  simulateTx,
  txOverrides,
}: QueueTxParams) => {
  logger({
    level: "info",
    message: `Queueing transaction for chain ${chainId} with extension ${extension}`,
    service: "server",
  });

  // TODO: We need a much safer way of detecting if the transaction should be a user operation
  const isUserOp = !!(tx.getSigner as ERC4337EthersSigner).erc4337provider;
  const txData = {
    chainId: chainId.toString(),
    functionName: tx.getMethod(),
    functionArgs: JSON.stringify(tx.getArgs()),
    extension,
    deployedContractAddress: deployedContractAddress,
    deployedContractType: deployedContractType,
    data: tx.encode(),
    value: BigNumber.from(await tx.getValue()).toHexString(),
    ...txOverrides,
  };

  if (isUserOp) {
    logger({
      level: "info",
      message: `isUserOp: ${isUserOp}`,
      service: "server",
    });

    const signerAddress = await (
      tx.getSigner as ERC4337EthersSigner
    ).originalSigner.getAddress();
    const accountAddress = await tx.getSignerAddress();
    const target = tx.getTarget();

    logger({
      level: "info",
      message: `isUserOp: ${isUserOp} - signerAddress: ${signerAddress} - accountAddress: ${accountAddress} - target: ${target}`,
      service: "server",
    });

    const { id: queueId } = await queueTxRaw(
      {
        ...txData,
        signerAddress,
        accountAddress,
        target,
      },
      simulateTx,
    );

    return queueId;
  } else {
    logger({
      level: "info",
      message: `isEOATransaction`,
      service: "server",
    });

    const fromAddress = await tx.getSignerAddress();
    const toAddress =
      tx.getTarget() === "0x0000000000000000000000000000000000000000" &&
      txData.functionName === "deploy" &&
      extension === "deploy-published"
        ? undefined
        : tx.getTarget();

    logger({
      level: "info",
      message: `fromAddress: ${fromAddress} - toAddress: ${toAddress}`,
      service: "server",
    });

    const { id: queueId } = await queueTxRaw(
      {
        ...txData,
        fromAddress,
        toAddress,
      },
      simulateTx,
    );

    return queueId;
  }
};
