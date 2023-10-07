import chalk from "chalk";
import { SingleBar } from "cli-progress";
import { config } from "dotenv";
import { fetchEngine } from "./load/fetch";
import { sleep, time } from "./load/time";
import { TxStatus, awaitTx } from "./load/tx";

config();

interface TaskResult {
  txStatus: TxStatus;
  txQueueTime: number;
  txMineTime: number;
  userOpStatus: TxStatus;
  userOpQueueTime: number;
  userOpMineTime: number;
}

interface TimedResult extends TaskResult {
  time: number;
}

const chain = `arbitrum-goerli`;
const host = `https://engine-load-testing-small-s4ym.zeet-nftlabs.zeet.app`;
const deployerWalletAddress = `0x43CAe0d7fe86C713530E679Ce02574743b2Ee9FC`;
const tokenAddress = `0x7A0CE8524bea337f0beE853B68fAbDE145dAC0A0`;
const accountFactoryAddress = `0xD48f9d337626a991e5c86c38768DA09428Fa549B`;
const thirdwebApiSecretKey = process.env.THIRDWEB_API_SECRET_KEY as string;
const loadTestBatchSize = parseInt(process.env.LOAD_TEST_BATCH_SIZE || "2");
const loadTestBatches = parseInt(process.env.LOAD_TEST_BATCHES || "60");

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

    progress.start(loadTestBatchSize * loadTestBatches * 2, 0);

    for (let i = 0; i < loadTestBatches; i++) {
      txs.push(
        ...[...Array(loadTestBatchSize)].map(() =>
          time(async (): Promise<TaskResult> => {
            const { res } = await fetchEngine({
              host,
              path: `/backend-wallet/create`,
              method: `POST`,
              thirdwebApiSecretKey,
            });
            const backendWalletAddress = res.result.walletAddress;

            const tx = await awaitTx({
              host,
              path: `/contract/${chain}/${accountFactoryAddress}/account-factory/create-account`,
              backendWalletAddress: deployerWalletAddress,
              body: JSON.stringify({
                admin_address: backendWalletAddress,
              }),
              thirdwebApiSecretKey,
            });

            if (tx.status !== TxStatus.Mined) {
              return {
                txStatus: tx.status,
                txQueueTime: tx.queueTime || 0,
                txMineTime: 0,
                userOpStatus: TxStatus.Unsent,
                userOpMineTime: 0,
                userOpQueueTime: 0,
              };
            }

            const accountAddress = tx.receipt.deployedContractAddress;
            progress.increment();

            const { res: sigRes } = await fetchEngine({
              host,
              path: `/contract/${chain}/${tokenAddress}/erc20/signature/generate`,
              backendWalletAddress: deployerWalletAddress,
              body: JSON.stringify({
                to: accountFactoryAddress,
                quantity: "1",
              }),
              thirdwebApiSecretKey,
            });
            const signedPayload = sigRes.result;

            const userOp = await awaitTx({
              host,
              path: `/contract/${chain}/${tokenAddress}/erc20/signature/mint`,
              backendWalletAddress,
              accountAddress,
              thirdwebApiSecretKey,
              body: JSON.stringify(signedPayload),
            });
            progress.increment();

            return {
              txStatus: tx.status,
              txQueueTime: tx.queueTime,
              txMineTime: tx.mineTime,
              userOpStatus: userOp.status,
              userOpQueueTime: userOp.queueTime || 0,
              userOpMineTime: userOp.mineTime || 0,
            };
          }),
        ),
      );

      await sleep(1000);
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
    const erroredUserOps = awaitedTxs.filter(
      (tx) => tx.userOpStatus === TxStatus.Error,
    );
    const pendingUserOps = awaitedTxs.filter(
      (tx) => tx.userOpStatus === TxStatus.Pending,
    );
    const minedUserOps = awaitedTxs
      .filter((tx) => tx.userOpStatus === TxStatus.Mined)
      .sort((a, b) => a.userOpMineTime - b.userOpMineTime);

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

    console.log(chalk.blue("\n\n===== User Operations =====\n"));
    console.table({
      errored: erroredUserOps.length,
      pending: pendingUserOps.length,
      mined: minedUserOps.length,
    });

    console.table({
      "avg queued time":
        minedUserOps.reduce(
          (acc, curr) => acc + (curr.userOpQueueTime ?? 0),
          0,
        ) / minedUserOps.length,
      "min queued time": minedUserOps[0].userOpQueueTime ?? 0,
      "max queued time":
        minedUserOps[minedUserOps.length - 1].userOpQueueTime ?? 0,
      "avg mined time":
        minedUserOps.reduce(
          (acc, curr) => acc + (curr.userOpMineTime ?? 0),
          0,
        ) / minedUserOps.length,
      "min mined time": minedUserOps[0].userOpMineTime ?? 0,
      "max mined time":
        minedUserOps[minedUserOps.length - 1].userOpMineTime ?? 0,
    });

    return {};
  });

  console.log(`[Total Time Taken] ${totalTime}`);
};

main();
