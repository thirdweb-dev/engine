import { eth_getBlockByNumber, getRpcClient } from "thirdweb";
import { getChain } from "../chain.js";
import { thirdwebClient } from "../sdk.js";

export const getBlockTimeSeconds = async (
  chainId: number,
  blocksToEstimate: number,
) => {
  const chain = await getChain(chainId);
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain,
  });

  const latestBlock = await eth_getBlockByNumber(rpcRequest, {
    blockTag: "latest",
    includeTransactions: false,
  });
  const referenceBlock = await eth_getBlockByNumber(rpcRequest, {
    blockNumber: latestBlock.number - BigInt(blocksToEstimate),
    includeTransactions: false,
  });

  const diffSeconds = latestBlock.timestamp - referenceBlock.timestamp;
  return Number(diffSeconds) / (blocksToEstimate + 1);
};
