import { checkTablesExistence, env, implementTriggerOnStartUp } from "../core";
import { startTxUpdatesNotificationListener } from "./controller/tx-update-listener";
import createServer from "./helpers/server";

const main = async () => {
  const server = await createServer("API-Server");

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

  try {
    // Check for the Tables Existence post startup
    await checkTablesExistence(server);
    await implementTriggerOnStartUp(server);
    await startTxUpdatesNotificationListener(server);
    //check walletType and make sure i got all the access i need
  } catch (err) {
    console.log(err);
  }
};

main();
