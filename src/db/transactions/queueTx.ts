import type { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import type { ContractExtension } from "../../schema/extension";
import { InputTransaction } from "../../schema/transaction";
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
}: QueueTxParams): Promise<string> => {
  const tx: InputTransaction = {
    idempotencyKey,
    chainId,
    functionName: sdkTx.getMethod(),
    functionArgs: JSON.stringify(sdkTx.getArgs()),
    extension,
    deployedContractAddress,
    deployedContractType,
    data: sdkTx.encode(),
    value: BigInt(await sdkTx.getValue().toString()),
  };

  // TODO: We need a much safer way of detecting if the transaction should be a user operation
  const isUserOp = !!(sdkTx.getSigner as ERC4337EthersSigner).erc4337provider;
  if (isUserOp) {
    return await queueTxRaw({
      tx: {
        ...tx,
        signerAddress: await (
          sdkTx.getSigner as ERC4337EthersSigner
        ).originalSigner.getAddress(),
        accountAddress: await sdkTx.getSignerAddress(),
        target: sdkTx.getTarget(),
      },
      simulateTx,
    });
  }

  return await queueTxRaw({
    tx: {
      ...tx,
      fromAddress: await sdkTx.getSignerAddress(),
      toAddress: sdkTx.getTarget(),
    },
    simulateTx,
  });
};
