import type { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";
import type { ContractExtension } from "../../schema/extension";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface QueueTxParams {
  pgtx?: PrismaTransaction;
  tx: Transaction<any> | DeployTransaction;
  chainId: number;
  extension: ContractExtension;
  // TODO: These shouldn't be in here...
  deployedContractAddress?: string;
  deployedContractType?: string;
}

// TODO: Simulation should be done before this function...
export const queueTx = async ({
  pgtx,
  tx,
  chainId,
  extension,
  deployedContractAddress,
  deployedContractType,
}: QueueTxParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  // TODO: SDK should have a JSON.stringify() method.
  const fromAddress = (await tx.getSignerAddress()).toLowerCase();
  const toAddress = tx.getTarget().toLowerCase();
  const data = tx.encode();
  const functionName = tx.getMethod();
  const functionArgs = tx.getArgs().toString();
  const value = BigNumber.from(await tx.getValue()).toHexString();

  // TODO: Should we call this txId so it's easier to spell?
  const { id: queueId } = await prisma.transaction.create({
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
