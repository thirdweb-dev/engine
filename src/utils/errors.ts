import { Transactions } from ".prisma/client";
import {
  createThirdwebClient,
  defineChain,
  prepareTransaction,
  simulateTransaction,
} from "thirdweb";

interface EthersError {
  reason: string;
  code: string;
  error: any;
  method: string;
  transaction: any;
}

const client = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

export const parseTxError = async (
  tx: Transactions,
  err: any,
): Promise<string> => {
  if (!err) {
    return "Unexpected error.";
  }
  const chain = await defineChain(Number(tx.chainId));

  if (err.message.includes("insufficient funds")) {
    return `Insufficient ${chain?.nativeCurrency?.symbol} on ${
      chain.name
    } in backend wallet ${tx.fromAddress!}.`;
  }

  const transaction = prepareTransaction({
    to: tx.toAddress!,
    value: BigInt(tx.value!),
    data: tx.data! as `0x${string}`,
    chain,
    client,
  });

  const simResult = await simulateTransaction({ transaction });

  if ("message" in simResult) {
    return simResult.message;
  }

  if ("message" in err) {
    return err.message;
  }
  return err.toString();
};
