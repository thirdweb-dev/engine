import { checkTablesExistence, implementTriggerOnStartUp } from "../core";
import "../env";
import { env } from "../env";
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
  } catch (err) {
    console.log(err);
  }
};

main();
