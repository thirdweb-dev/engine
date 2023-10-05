import { FetchEngineParams, fetchEngine } from "./fetch";
import { sleep, time } from "./time";

export enum TxStatus {
  Unsent = "unsent",
  Mined = "mined",
  Pending = "pending",
  Error = "error",
}

type AwaitTxResult =
  | {
      status: TxStatus.Error;
      error: string;
      queueTime?: never;
      mineTime?: never;
      receipt?: never;
    }
  | {
      status: TxStatus.Mined;
      queueTime: number;
      mineTime: number;
      error?: never;
      receipt: any;
    }
  | {
      status: TxStatus.Pending;
      queueTime: number;
      mineTime?: never;
      error?: never;
      receipt?: never;
    };

interface AwaitTxParams extends FetchEngineParams {
  abortTimeInSeconds?: number;
}

// Abort waiting after 5 minutes
const DEFAULT_ABORT_TIME = 60 * 5;

export const awaitTx = async (params: AwaitTxParams) => {
  return time(async (): Promise<AwaitTxResult> => {
    try {
      const { time: queueTime, res } = await fetchEngine(params);
      const queueId = res.result.queueId;

      const startTime = Date.now();
      while (true) {
        if (
          (Date.now() - startTime) / 1000 >
          (params.abortTimeInSeconds || DEFAULT_ABORT_TIME)
        ) {
          return {
            status: TxStatus.Pending,
            queueTime,
          };
        }

        const { time: mineTime, res } = await fetchEngine({
          host: params.host,
          method: "GET",
          path: `/transaction/status/${queueId}`,
          thirdwebApiSecretKey: params.thirdwebApiSecretKey,
        });

        if (res.result?.status === "mined") {
          return {
            status: TxStatus.Mined,
            queueTime,
            mineTime,
            receipt: res.result,
          };
        } else if (res.result?.status === "errored") {
          return {
            status: TxStatus.Error,
            error: res.result?.errorMessage,
          };
        }

        // Poll for transaction status every 10 seconds
        await sleep(10000);
      }
    } catch (err: any) {
      return {
        status: TxStatus.Error,
        error: err.message,
      };
    }
  });
};
