import { getEnv } from "../core";
import createServer from "./helpers/server";
import { checkTablesExistence, implementTriggerOnStartUp } from "../core";
import { envVariablesCheck, walletEnvVariablesCheck } from "../core/startup";
import {
  THIRDWEB_SDK_REQUIRED_ENV_VARS,
  WEB3_API_SERVER_ENV_VARS,
  WEB3_API_WALLETS_ENV_VARS,
} from "../core/constants";

const main = async () => {
  const server = await createServer("API-Server");

  server.listen(
    {
      host: getEnv("HOST", "0.0.0.0"),
      port: Number(getEnv("PORT", 3005)),
    },
    (err) => {
      if (err) {
        server.log.error(err);
        process.exit(1);
      }
    },
  );

  try {
    await envVariablesCheck(
      server,
      WEB3_API_SERVER_ENV_VARS.concat(THIRDWEB_SDK_REQUIRED_ENV_VARS),
    );
    await walletEnvVariablesCheck(server, WEB3_API_WALLETS_ENV_VARS);
    // Check for the Tables Existence post startup
    await checkTablesExistence(server);
    await implementTriggerOnStartUp(server);
  } catch (err) {
    console.log(err);
  }
};

main();
