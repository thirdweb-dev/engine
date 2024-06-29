import chalk from "chalk";
import { SingleBar } from "cli-progress";
import { config } from "dotenv";
import { time } from "../utils/time";
import { TxStatus, awaitTx } from "../utils/tx";

config();

interface TaskResult {
  txStatus: TxStatus;
  txQueueTime: number;
  txMineTime: number;
}

interface TimedResult extends TaskResult {
  time: number;
}

const chain = `sepolia`;
//const host = `http://localhost:3005`;
const host = `https://gg.furqan.sh:4435`;
const backendWalletAddress = `0xa117e64D1Ced1F1e2A7089fca981f360e4ec1Eaa`;
const nftTokenContractAddress = `0xfF86ba9194355EF12c0B950a3ed64047d40c49CF`;
const thirdwebApiSecretKey = process.env.THIRDWEB_API_SECRET_KEY as string;
const loadTestBatchSize = parseInt(process.env.LOAD_TEST_BATCH_SIZE || "1");
const loadTestBatches = parseInt(process.env.LOAD_TEST_BATCHES || "1");

const main = async () => {
  const { time: totalTime } = await time(async () => {
    const txs: Promise<TimedResult>[] = [];

    console.log(
      `\nSending ${chalk.blue(
        loadTestBatchSize,
      )} transactions & user operations per second for ${chalk.green(
        loadTestBatches,
      )} seconds\n`,
    );

    const progress = new SingleBar({
      format: `Progress | {bar} | {percentage}% | {value}/{total}`,
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    });

    progress.start(loadTestBatchSize * loadTestBatches, 0);

    for (let i = 0; i < loadTestBatches; i++) {
      txs.push(
        ...[...Array(loadTestBatchSize)].map(() =>
          time(async (): Promise<TaskResult> => {
            const tx = await awaitTx({
              host,
              path: `/contract/${chain}/${nftTokenContractAddress}/erc721/mint-to`,
              backendWalletAddress,
              body: JSON.stringify({
                receiver: backendWalletAddress,
                metadata: {
                  name: "Engine Test NFT",
                  description: "Engine Test NFT description",
                  image:
                    "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
                },
              }),
              thirdwebApiSecretKey,
            });

            if (tx.status !== TxStatus.Mined) {
              return {
                txStatus: tx.status,
                txQueueTime: tx.queueTime || 0,
                txMineTime: 0,
              };
            }

            progress.increment();

            return {
              txStatus: tx.status,
              txQueueTime: tx.queueTime,
              txMineTime: tx.mineTime,
            };
          }),
        ),
      );
    }

    const awaitedTxs = await Promise.all(txs);
    progress.stop();

    const erroredTxs = awaitedTxs.filter(
      (tx) => tx.txStatus === TxStatus.Error,
    );
    const pendingTxs = awaitedTxs.filter(
      (tx) => tx.txStatus === TxStatus.Pending,
    );
    const minedTxs = awaitedTxs
      .filter((tx) => tx.txStatus === TxStatus.Mined)
      .sort((a, b) => a.txMineTime - b.txMineTime);

    console.log(chalk.blue(`\n\n===== Transactions =====\n`));
    console.table({
      errored: erroredTxs.length,
      pending: pendingTxs.length,
      mined: minedTxs.length,
    });

    console.table({
      "avg queued time":
        minedTxs.reduce((acc, curr) => acc + (curr.txQueueTime ?? 0), 0) /
        minedTxs.length,
      "min queued time": minedTxs[0].txQueueTime ?? 0,
      "max queued time": minedTxs[minedTxs.length - 1].txQueueTime ?? 0,
      "avg mined time":
        minedTxs.reduce((acc, curr) => acc + (curr.txMineTime ?? 0), 0) /
        minedTxs.length,
      "min mined time": minedTxs[0].txMineTime ?? 0,
      "max mined time": minedTxs[minedTxs.length - 1].txMineTime ?? 0,
    });

    return {};
  });

  console.log(`[Total Time Taken] ${totalTime}`);
};

main();
