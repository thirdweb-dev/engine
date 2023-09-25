import autocannon from "autocannon";
import { BenchmarkConfiguration } from "./config";
import { logger } from "./logger";

export const sendTxs = async (config: BenchmarkConfiguration) => {
  logger.info(
    `Sending ${config.requests} requests to ${config.host}${config.path} with a concurrency of ${config.concurrency}.`,
  );

  const txnIds: string[] = [];

  return new Promise<string[]>(async (resolve, reject) => {
    const requests = autocannon({
      url: config.host,
      connections: config.concurrency,
      amount: config.requests,
      requests: [
        {
          path: config.path,
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            "x-wallet-address": config.walletAddress,
            "content-type": "application/json",
            ...(config.accountAddress
              ? { "x-account-address": config.accountAddress }
              : {}),
          },
          method: "POST",
          body: config.body,
          // @ts-ignore: autocannon types are 3 minor versions behind.
          // This was one of the new field that was recently added
          onResponse: (status: number, body: string) => {
            if (status === 200) {
              const parsedResult: { result?: string } = JSON.parse(body);
              if (!parsedResult.result) {
                logger.error(
                  `Response body does not contain a "result" field: ${body}`,
                );
                return reject({
                  error: "Response body does not contain a 'result' field",
                });
              }
              txnIds.push(parsedResult.result);
            } else {
              logger.error(
                `Received status code ${status} from server. Body: ${body}`,
              );
              return reject({
                error: `Received status code ${status} from server.`,
              });
            }
          },
        },
      ],
    });

    autocannon.track(requests, {
      renderLatencyTable: false,
      renderResultsTable: false,
    });

    const result = autocannon.printResult(await requests);
    logger.info(result);
    resolve(txnIds);
  });
};

export const awaitTx = async ({
  txnId,
  host,
  apiKey,
}: {
  txnId: string;
  host: string;
  apiKey: string;
}): Promise<any> => {
  try {
    const res = await fetch(`${host}/transaction/status/${txnId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const data = await res.json();

    if (data.result?.status === "mined" || data.result?.status === "errored") {
      return data.result;
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));
    return awaitTx({ txnId, host, apiKey });
  } catch (error) {
    console.error("awaitTx error", error);
  }
};
