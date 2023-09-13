import { implementTriggerOnStartUp } from "../../core";
import createServer from "../../server/helpers/server";

const server = await createServer("Test-Suite");
server.log.info("Setting up required Tables, Triggers and Functions");

await implementTriggerOnStartUp(server);
server.log.info("Server setup done");
