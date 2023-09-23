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

  // TODO: We need a much safer way of detecting if the transaction should be a user operation
  if ((tx.getSigner as ERC4337EthersSigner).erc4337provider) {
    const signerAddress = await (
      tx.getSigner as ERC4337EthersSigner
    ).originalSigner.getAddress();
    const { id: queueId } = await prisma.transactions.create({
      data: {
        chainId,
        signerAddress,
        accountAddress: fromAddress,
        target: toAddress,
        data,
        value,
      },
    });

    return queueId;
  } else {
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
  }
};
