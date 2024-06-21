import chalk from "chalk";
import { SingleBar } from "cli-progress";
import { config } from "dotenv";
import { fetchEngine } from "../utils/fetch";
import { sleep, time } from "../utils/time";
import { TxStatus, awaitTx } from "../utils/tx";

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

const chain = `sepolia`;
//const host = `https://engine-load-testing-small-s4ym.zeet-nftlabs.zeet.app`;
const host = `https://gg.furqan.sh:4435`;
const deployerWalletAddress = `0xa117e64D1Ced1F1e2A7089fca981f360e4ec1Eaa`;
const tokenAddress = `0x7A0CE8524bea337f0beE853B68fAbDE145dAC0A0`;
const accountFactoryAddress = `0x85e23b94e7F5E9cC1fF78BCe78cfb15B81f0DF00`;
const thirdwebApiSecretKey = process.env.THIRDWEB_API_SECRET_KEY as string;
const loadTestBatchSize = parseInt(process.env.LOAD_TEST_BATCH_SIZE || "30");
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
              body: JSON.stringify({}),
            });
            console.log({ res });
            const backendWalletAddress = res.result.walletAddress;

            const tx = await awaitTx({
              host,
              path: `/contract/${chain}/${accountFactoryAddress}/account-factory/create-account`,
              backendWalletAddress: deployerWalletAddress,
              body: JSON.stringify({
                adminAddress: backendWalletAddress,
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
                to: accountAddress,
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
              userOpStatus: userOp.status || TxStatus.Error,
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
