import type { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { BigNumber } from "ethers";
import type { ContractExtension } from "../../schema/extension";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface QueueTxParams {
  pgtx?: PrismaTransaction;
  tx: Transaction<any> | DeployTransaction;
  chainId: number;
  extension: ContractExtension;
  // TODO: These shouldn't be in here
  deployedContractAddress?: string;
  deployedContractType?: string;
}

// TODO: Simulation should be done before this function
export const queueTx = async ({
  pgtx,
  tx,
  chainId,
  extension,
  deployedContractAddress,
  deployedContractType,
}: QueueTxParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  // TODO: We need a much safer way of detecting if the transaction should be a user operation
  const isUserOp = !!(tx.getSigner as ERC4337EthersSigner).erc4337provider;

  if (isUserOp) {
    const { id: queueId } = await prisma.transactions.create({
      data: {
        chainId,
        // Fields needed to get smart wallet signer in worker
        signerAddress: await (
          tx.getSigner as ERC4337EthersSigner
        ).originalSigner.getAddress(),
        accountAddress: (await tx.getSignerAddress()).toLowerCase(),
        // Fields needed to send user operation
        target: tx.getTarget().toLowerCase(),
        data: tx.encode(),
        value: BigNumber.from(await tx.getValue()).toHexString(),
        // Fields for enhanced data
        functionName: tx.getMethod(),
        functionArgs: tx.getArgs().toString(),
        extension,
        deployedContractAddress,
        deployedContractType,
      },
    });

    return queueId;
  } else {
    const { id: queueId } = await prisma.transactions.create({
      data: {
        chainId,
        // Fields needed to send transaction
        fromAddress: (await tx.getSignerAddress()).toLowerCase(),
        toAddress: tx.getTarget().toLowerCase(),
        data: tx.encode(),
        value: BigNumber.from(await tx.getValue()).toHexString(),
        // Fields for enhanced data
        functionName: tx.getMethod(),
        functionArgs: tx.getArgs().toString(),
        extension,
        deployedContractAddress,
        deployedContractType,
      },
    });

    return queueId;
  }
};
