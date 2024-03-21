import { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
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
}

export const queueTx = async ({
  tx,
  chainId,
  extension,
  deployedContractAddress,
  deployedContractType,
  simulateTx,
}: QueueTxParams) => {
  // TODO: We need a much safer way of detecting if the transaction should be a user operation

  const isUserOp = !!(tx.getSigner as ERC4337EthersSigner).erc4337provider;
  const txData = {
    chainId: chainId.toString(),
    functionName: tx.getMethod(),
    functionArgs: JSON.stringify(tx.getArgs()),
    extension,
    deployedContractAddress,
    deployedContractType,
    data: tx.encode(),
    value: BigNumber.from(await tx.getValue()).toHexString(),
  };

  if (isUserOp) {
    const signerAddress = await (
      tx.getSigner as ERC4337EthersSigner
    ).originalSigner.getAddress();
    const accountAddress = await tx.getSignerAddress();
    const target = tx.getTarget();

    const { id: queueId } = await queueTxRaw({
      ...txData,
      signerAddress,
      accountAddress,
      target,
      simulateTx,
    });
    return queueId;
  } else {
    const fromAddress = await tx.getSignerAddress();
    const toAddress = tx.getTarget();

    const { id: queueId } = await queueTxRaw({
      ...txData,
      fromAddress,
      toAddress,
      simulateTx,
    });

    return queueId;
  }
};
