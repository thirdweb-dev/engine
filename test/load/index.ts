import chalk from "chalk";
import { SingleBar } from "cli-progress";
import { program } from "commander";
import prompts from "prompts";
import { z } from "zod";
import { fetchEngine } from "./utils/fetch";
import { createTimer, sleep } from "./utils/time";

const OptionsSchema = z.object({
  host: z.string().optional(),
  path: z.string().optional(),
  body: z.string().optional(),
  method: z.string().optional(),
  backendWalletAddress: z.string().optional(),
  accountAddress: z.string().optional(),
  secretKey: z.string().optional(),
  rps: z
    .string()
    .default("30")
    .transform((arg) => parseInt(arg)),
  duration: z
    .string()
    .default("1")
    .transform((arg) => parseInt(arg)),
});

type OptionsInput = z.input<typeof OptionsSchema>;

type Result = {
  requestTime: number;
  status?: "mined" | "errored" | "pending";
  sendTime?: number;
  mineTime?: number;
};

program
  .description(`Load test how much throughput an engine endpoint can handle`)
  .option(`--host <string>`, `The engine API host URL`)
  .option(`--path <string>`, `The path of the endpoint to load test`)
  .option(`--method <string>`, `The request method to use`)
  .option(`--body <string>`, `The request body to load test with`)
  .option(
    `--secret-key <string>`,
    `The thirdweb API secret key to use with the server`,
  )
  .option(
    `--backend-wallet-address <string>`,
    `The x-backend-wallet-address header`,
  )
  .option(`--account-address <string>`, `The x-account-address header`)
  .option(`--rps <number>`, `The number of requests per second to send`)
  .option(`--duration <number>`, `The number of seconds to send requests for`)
  .action(async (optionsInput: OptionsInput) => {
    const options = OptionsSchema.parse(optionsInput);

    if (!options.host) {
      const { res } = await prompts({
        type: "text",
        name: "res",
        message: "What is your engine API host URL",
        format: (url) => url.replace(/\/$/, ""),
      });

      options.host = res;
    }

    if (!options.path) {
      const { res } = await prompts({
        type: "text",
        name: "res",
        message: "What is the path of the endpoint you want to load test?",
      });

      options.path = res;
    }

    if (!options.method) {
      const { res } = await prompts({
        type: "text",
        name: "res",
        message: "What is the request method to use?",
      });

      options.method = res;
    }

    if (options.method === `POST` && !options.body) {
      const { res } = await prompts({
        type: "text",
        name: "res",
        message: "What is the request body to send to the endpoint?",
      });

      options.body = res;
    }

    if (!options.secretKey) {
      const { res } = await prompts({
        type: "text",
        name: "res",
        message: "What is the thirdweb api secret key to authorize with?",
      });

      options.secretKey = res;
    }

    if (!options.backendWalletAddress) {
      const { res } = await prompts({
        type: "text",
        name: "res",
        message:
          "What is the x-backend-wallet-address to send the request with?",
      });

      options.backendWalletAddress = res;
    }

    console.log(
      `\nSending ${chalk.blue(
        options.rps,
      )} requests per second for ${chalk.green(options.duration)} seconds\n`,
    );

    const progress = new SingleBar({
      format: `Progress | {bar} | {percentage}% | {value}/{total}`,
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true,
    });

    progress.start(options.duration * options.rps * 2, 0);

    const promises: Promise<void>[] = [];
    const results: Result[] = [];
    for (let i = 0; i < options.duration; i++) {
      promises.push(
        ...[...Array(options.rps)].map(async () => {
          const result: Result = {
            requestTime: 0,
          };

          const timer = createTimer();
          const { res } = await fetchEngine({
            method: options.method,
            host: options.host as string,
            path: options.path as string,
            body: options.body,
            backendWalletAddress: options.backendWalletAddress as string,
            accountAddress: options.accountAddress,
            thirdwebApiSecretKey: options.secretKey as string,
          });
          result.requestTime = timer.ellapsed();
          progress.increment();

          if (res?.result?.queueId) {
            const timer = createTimer();

            while (true) {
              if (timer.ellapsed() > 5 * 60) {
                result.status = "pending";
                break;
              }

              const {
                res: {
                  result: { status, sentAt, minedAt },
                },
              } = await fetchEngine({
                host: options.host as string,
                method: "GET",
                path: `/transaction/status/${res.result.queueId}`,
                thirdwebApiSecretKey: options.secretKey as string,
              });

              if (status === "mined") {
                result.status = "mined";
                result.sendTime = timer.ellapsed(new Date(sentAt));
                result.mineTime = timer.ellapsed(new Date(minedAt));
                break;
              } else if (res.result?.status === "sent") {
              } else if (res.result?.status === "errored") {
                result.status = "errored";
                break;
              }

              await sleep(5000);
            }
          }

          progress.increment();

          results.push(result);
        }),
      );

      await sleep(1000);
    }

    await Promise.all(promises);

    progress.stop();

    console.log("\n\nrequest times (seconds)");
    console.table({
      average:
        results.reduce((acc, curr) => acc + curr.requestTime, 0) /
        results.length,
      minimum: results.sort((a, b) => a.requestTime - b.requestTime)[0]
        .requestTime,
      maximum: results.sort((a, b) => a.requestTime - b.requestTime)[
        results.length - 1
      ].requestTime,
    });

    const minedResults = results.filter((res) => res.status === "mined");
    if (minedResults.length === 0) {
      return;
    }

    console.log("\n\nsent times (seconds)");
    console.table({
      average:
        results.reduce((acc, curr) => acc + curr.sendTime!, 0) / results.length,
      minimum: results.sort((a, b) => a.sendTime! - b.sendTime!)[0].sendTime,
      maximum: results.sort((a, b) => a.sendTime! - b.sendTime!)[
        results.length - 1
      ].sendTime,
    });

    console.log("\n\nmine times (seconds)");
    console.table({
      average:
        minedResults.reduce((acc, curr) => acc + curr.mineTime!, 0) /
        minedResults.length,
      minimum: minedResults.sort((a, b) => a.mineTime! - b.mineTime!)[0]
        .mineTime,
      maximum: minedResults.sort((a, b) => a.mineTime! - b.mineTime!)[
        minedResults.length - 1
      ].mineTime,
    });

    console.log("\n\ntransaction status");
    console.table({
      errored: results.filter((res) => res.status === "errored").length,
      pending: results.filter((res) => res.status === "pending").length,
      mined: minedResults.length,
    });
  });

program.parse();
