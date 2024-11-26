import path from "node:path";
import { config } from "dotenv";

config({
  path: [path.resolve(".env.test.local"), path.resolve(".env.test")],
});

import { createServer } from "prool";
import { anvil } from "prool/instances";

export async function setup() {
  const server = createServer({
    instance: anvil(),
    port: 8645, // Choose an appropriate port
  });
  await server.start();
  // Return a teardown function that will be called after all tests are complete
  return async () => {
    await server.stop();
  };
}
