import { getSdk } from "../cache/getSdk";
import { logger } from "../logger";

const KNOWN_BLOCKTIME_SECONDS = {
  1: 12,
  137: 2,
} as Record<number, number>;

const DEFAULT_BLOCKTIME_SECONDS = 10;
const BLOCKS_TO_ESTIMATE = 100;

export const getBlockTimeSeconds = async (chainId: number) => {
  if (KNOWN_BLOCKTIME_SECONDS[chainId]) {
    return KNOWN_BLOCKTIME_SECONDS[chainId];
  }

  const sdk = await getSdk({ chainId });
  const provider = sdk.getProvider();
  try {
    const latestBlockNumber = await provider.getBlockNumber();
    const blockNumbers = Array.from(
      { length: BLOCKS_TO_ESTIMATE },
      (_, i) => latestBlockNumber - i - 1,
    );

    const blocks = await Promise.all(
      blockNumbers.map(async (blockNumber) => {
        const block = await provider.getBlock(blockNumber);
        return block;
      }),
    );

    let totalTimeDiff = 0;
    for (let i = 0; i < blocks.length - 1; i++) {
      totalTimeDiff += blocks[i].timestamp - blocks[i + 1].timestamp;
    }

    const averageBlockTime = totalTimeDiff / (blocks.length - 1);
    return averageBlockTime;
  } catch (error) {
    logger({
      service: "worker",
      level: "error",
      message: `Error estimating block time for chainId ${chainId}:`,
      error,
    });
    return DEFAULT_BLOCKTIME_SECONDS;
  }
};
