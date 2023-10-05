import { config } from "dotenv";

config();

interface AwaitTxParams {
  path: string;
  thirdwebApiSecretKey: string;
  method?: string;
  backendWalletAddress?: string;
  accountAddress?: string;
  body?: string;
}

enum TxStatus {
  Mined = "mined",
  Pending = "pending",
  Error = "error",
}

type AwaitTxResult =
  | {
      status: TxStatus.Error;
      time: number;
      error: string;
      result?: never;
    }
  | {
      status: TxStatus.Mined;
      time: number;
      error?: never;
      result: any;
    }
  | {
      status: TxStatus.Pending;
      time: number;
      error?: never;
      result?: never;
    };

const HOST = `http://127.0.0.1:3005`;

const ellapsedSince = (startTime: number) => {
  return (Date.now() - startTime) / 1000;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchApi = async ({
  method,
  path,
  backendWalletAddress,
  accountAddress,
  thirdwebApiSecretKey,
  body,
}: AwaitTxParams) => {
  const res = await fetch(`${HOST}${path}`, {
    method: method || "POST",
    headers: {
      Authorization: `Bearer ${thirdwebApiSecretKey}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(backendWalletAddress
        ? { "x-backend-wallet-address": backendWalletAddress }
        : {}),
      ...(accountAddress ? { "x-account-address": accountAddress } : {}),
    },
    body,
  });

  return res.json();
};

const awaitTx = async (params: AwaitTxParams): Promise<AwaitTxResult> => {
  const startTime = Date.now();

  try {
    const res = await fetchApi(params);
    const queueId = res.result.queueId as string;

    while (true) {
      // Abort with pending if transaction takes > 2 mins to get mined
      if (ellapsedSince(startTime) > 60 * 10) {
        return {
          status: TxStatus.Pending,
          time: ellapsedSince(startTime),
        };
      }

      const res = await fetchApi({
        method: "GET",
        path: `/transaction/status/${queueId}`,
        thirdwebApiSecretKey: params.thirdwebApiSecretKey,
      });

      if (res.result?.status === "mined") {
        return {
          status: TxStatus.Mined,
          time: ellapsedSince(startTime),
          result: res,
        };
      } else if (res.result?.status === "errored") {
        return {
          status: TxStatus.Error,
          time: ellapsedSince(startTime),
          error: res.result?.errorMessage,
        };
      }

      // Wait 10s between polling
      await sleep(10000);
    }
  } catch (err: any) {
    return {
      status: TxStatus.Error,
      time: ellapsedSince(startTime),
      error: err?.message || err,
    };
  }
};

const main = async () => {
  const chain = `arbitrum-goerli`;
  const accountFactoryAddress = `0xD48f9d337626a991e5c86c38768DA09428Fa549B`;
  const tokenAddress = `0x7A0CE8524bea337f0beE853B68fAbDE145dAC0A0`;
  const thirdwebApiSecretKey = process.env.THIRDWEB_API_SECRET_KEY as string;

  const txs: Promise<AwaitTxResult>[] = [];

  // Send a batch of requests every second
  for (let i = 0; i < 1; i++) {
    console.log(`[Sending Batch] ${i}`);
    txs.push(
      ...[...Array(3)].map(async () => {
        const startTime = Date.now();

        console.log(`[Wallet] Creating Backend Wallet`);
        const res = await fetchApi({
          path: `/backend-wallet/create`,
          method: `POST`,
          thirdwebApiSecretKey,
        });
        const backendWalletAddress = res.result.walletAddress;

        console.log(`[Transaction] Creating Account`);
        const awaitedTx = await awaitTx({
          path: `/contract/${chain}/${accountFactoryAddress}/account-factory/create-account`,
          backendWalletAddress: `0x43CAe0d7fe86C713530E679Ce02574743b2Ee9FC`,
          body: JSON.stringify({
            admin_address: backendWalletAddress,
          }),
          thirdwebApiSecretKey,
        });

        if (awaitedTx.status !== TxStatus.Mined) {
          return awaitedTx;
        }

        const accountAddress = awaitedTx.result.result.deployedContractAddress;

        console.log(`[Signature] Generating Payload`);
        const sigRes = await fetchApi({
          path: `/contract/${chain}/${tokenAddress}/erc20/signature/generate`,
          backendWalletAddress: `0x43CAe0d7fe86C713530E679Ce02574743b2Ee9FC`,
          body: JSON.stringify({
            to: accountAddress,
            quantity: "1",
          }),
          thirdwebApiSecretKey,
        });

        const signedPayload = sigRes.result;

        console.log(`[User Operation] Minting with Payload`);
        return {
          ...(await awaitTx({
            method: `POST`,
            path: `/contract/${chain}/${tokenAddress}/erc20/signature/mint`,
            backendWalletAddress,
            accountAddress,
            thirdwebApiSecretKey,
            body: JSON.stringify(signedPayload),
          })),
          time: ellapsedSince(startTime),
        };
      }),
    );
    await sleep(1000);
  }

  const awaitedTxs = await Promise.all(txs);
  const erroredTxs = awaitedTxs.filter((tx) => tx.status === TxStatus.Error);
  const pendingTxs = awaitedTxs.filter((tx) => tx.status === TxStatus.Pending);
  const minedTxs = awaitedTxs
    .filter((tx) => tx.status === TxStatus.Mined)
    .sort((a, b) => a.time - b.time);

  console.table({
    errored: erroredTxs.length,
    pending: pendingTxs.length,
    mined: minedTxs.length,
  });

  console.table({
    "avg mined time":
      minedTxs.reduce((acc, curr) => acc + (curr.time ?? 0), 0) /
      minedTxs.length,
    "min mined time": minedTxs[0].time ?? 0,
    "max mined time": minedTxs[minedTxs.length - 1].time ?? 0,
  });
};

main();
