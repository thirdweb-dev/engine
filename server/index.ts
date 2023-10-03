import { env } from "../src/utils/env";
import { logger } from "../src/utils/logger";
import { startTxUpdatesNotificationListener } from "./controller/tx-update-listener";
import createServer from "./helpers/server";

const main = async () => {
  const server = await createServer();

  server.listen(
    {
      host: env.HOST,
      port: env.PORT,
    },
    (err) => {
      if (err) {
        logger.server.error(err);
        process.exit(1);
      }
    },
  );

  try {
    // Check for the Tables Existence post startup
    await startTxUpdatesNotificationListener();
    //check walletType and make sure i got all the access i need
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

main();
