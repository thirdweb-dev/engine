import { env } from "../core";
import { createHTMLServer, createServer } from "./helpers/server";
import { startWorker } from "./startWorker";

let serverStarted = false;
const main = async () => {
  const htmlserver = await createHTMLServer("Config-Server");

  htmlserver.post(
    "/startServer",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            awsAccessKey: { type: "string" },
            awsAccessSecretKey: { type: "string" },
            awsRegion: { type: "string" },
            awsKmsKeyId: { type: "string" },
            gcpKmsKeyRing: { type: "string" },
            gcpKmsLocationId: { type: "string" },
            gcpKmsProjectId: { type: "string" },
            gcpKmsCryptoKeyId: { type: "string" },
          },
        },
      },
    },
    async (request: any, reply) => {
      try {
        if (serverStarted) {
          return reply.send({
            message: `Server already started at http://${env.HOST}:${env.PORT}/`,
          });
        }
        const {
          awsAccessKey,
          awsAccessSecretKey,
          awsRegion,
          awsKmsKeyId,
          gcpKmsCryptoKeyId,
          gcpKmsKeyRing,
          gcpKmsLocationId,
          gcpKmsProjectId,
        } = request.body;

        request.log.debug(
          `AWS Access Key: ${awsAccessKey}, AWS Access Secret Key: ${awsAccessSecretKey}, AWS Region: ${awsRegion}, AWS KMS Key ID: ${awsKmsKeyId}, GCP KMS Crypto Key ID: ${gcpKmsCryptoKeyId}, GCP KMS Key Ring: ${gcpKmsKeyRing}, GCP KMS Location ID: ${gcpKmsLocationId}, GCP KMS Project ID: ${gcpKmsProjectId}`,
        );
        const server = await createServer("API-Server");
        request.log.info("Starting API Server");
        server.listen(
          {
            host: env.HOST,
            port: env.PORT,
          },
          (err) => {
            if (err) {
              server.log.error(err);
              process.exit(1);
            }
          },
        );

        serverStarted = true;
        setTimeout(async () => {
          await startWorker();
        }, 5000);
        reply.send({
          message: `New server started at http://${env.HOST}:${env.PORT}/`,
        });
      } catch (err) {
        htmlserver.log.error(err);
      }
    },
  );

  await htmlserver.ready();

  htmlserver.listen(
    {
      host: env.HOST,
      port: 3000,
    },
    (err) => {
      if (err) {
        htmlserver.log.error(err);
        process.exit(1);
      }
    },
  );
};

main();
