import { Transactions } from ".prisma/client";
import { getChainByChainIdAsync } from "@thirdweb-dev/chains";
import { ethers } from "ethers";

interface EthersError {
  reason: string;
  code: string;
  error: any;
  method: string;
  transaction: any;
}

export const parseTxError = async (
  tx: Transactions,
  err: any,
): Promise<string> => {
  if (!err) {
    return "Unexpected error.";
  }

  if ((err as EthersError)?.code === ethers.errors.INSUFFICIENT_FUNDS) {
    const chain = await getChainByChainIdAsync(parseInt(tx.chainId));
    return `Insufficient ${chain.nativeCurrency.symbol} on ${
      chain.name
    } in backend wallet ${tx.fromAddress!}.`;
  }

  if ("message" in err) {
    return err.message;
  }
  return err.toString();
};
