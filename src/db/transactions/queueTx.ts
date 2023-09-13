import type { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";
import type { ContractExtension } from "../../schema/extension";
import { prisma } from "../client";

interface QueueTxParams {
  tx: Transaction<any> | DeployTransaction;
  chainId: number;
  extension: ContractExtension;
  // TODO: These shouldn't be in here...
  deployedContractAddress?: string;
  deployedContractType?: string;
}

// TODO: Simulation should be done before this function...
export const queueTx = async ({
  tx,
  chainId,
  extension,
  deployedContractAddress,
  deployedContractType,
}: QueueTxParams) => {
  // TODO: SDK should have a JSON.stringify() method.
  const fromAddress = (await tx.getSignerAddress()).toLowerCase();
  const toAddress = tx.getTarget().toLowerCase();
  const data = tx.encode();
  const functionName = tx.getMethod();
  const functionArgs = tx.getArgs().toString();
  const value = BigNumber.from(await tx.getValue()).toHexString();

  // TODO: Should we call this txId so it's easier to spell?
  const { id: queueId } = await prisma.transactions.create({
    data: {
      chainId,
      fromAddress,
      toAddress,
      data,
      value,
      functionName,
      functionArgs,
      extension,
      deployedContractAddress,
      deployedContractType,
    },
  });

  return queueId;
};
