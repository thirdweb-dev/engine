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
  } catch (err) {
    console.log(err);
  }

  // Listen for the SIGTERM signal (e.g., when the process is being stopped)
  process.on("SIGTERM", async () => {
    console.log("Received SIGTERM, shutting down gracefully...");

    // Destroy the knex instance, closing all pooled connections
    await server.database.destroy();

    console.log("Shutdown complete");
    process.exit(0);
  });
};

main();
