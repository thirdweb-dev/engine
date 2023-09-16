import createServer from "../../server/helpers/server";

const server = await createServer("Test-Suite");
server.log.info("Setting up required Tables, Triggers and Functions");
server.log.info("Server setup done");
