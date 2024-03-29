import { Transactions } from "@prisma/client";
import type { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { BigNumber } from "ethers";
import type { ContractExtension } from "../../schema/extension";
import { queueTxRaw } from "./queueTxRaw";

interface QueueTxParams {
  tx: Transaction<any> | DeployTransaction;
  chainId: number;
  extension: ContractExtension;
  // TODO: These shouldn't be in here
  deployedContractAddress?: string;
  deployedContractType?: string;
  simulateTx?: boolean;
  idempotencyKey?: string;
}

export const queueTx = async ({
  tx: sdkTx,
  chainId,
  extension,
  deployedContractAddress,
  deployedContractType,
  simulateTx,
  idempotencyKey,
}: QueueTxParams) => {
  const tx: Transactions = {
    chainId: chainId.toString(),
    functionName: sdkTx.getMethod(),
    functionArgs: JSON.stringify(sdkTx.getArgs()),
    extension,
    deployedContractAddress: deployedContractAddress || null,
    deployedContractType: deployedContractType || null,
    data: sdkTx.encode(),
    value: BigNumber.from(await sdkTx.getValue()).toHexString(),
  };

  // TODO: We need a much safer way of detecting if the transaction should be a user operation
  const isUserOp = !!(sdkTx.getSigner as ERC4337EthersSigner).erc4337provider;
  if (isUserOp) {
    tx.signerAddress = await (
      sdkTx.getSigner as ERC4337EthersSigner
    ).originalSigner.getAddress();
    tx.accountAddress = await sdkTx.getSignerAddress();
    tx.target = sdkTx.getTarget();

    const { id: queueId } = await queueTxRaw({
      tx,
      simulateTx,
      idempotencyKey,
    });
    return queueId;
  } else {
    tx.fromAddress = await sdkTx.getSignerAddress();
    tx.toAddress = sdkTx.getTarget();

    const { id: queueId } = await queueTxRaw({
      tx,
      simulateTx,
      idempotencyKey,
    });

    return queueId;
  }
};
