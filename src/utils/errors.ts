import { Transactions } from ".prisma/client";
import { getChainByChainIdAsync } from "@thirdweb-dev/chains";

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

  if (err.message.includes("insufficient funds")) {
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
