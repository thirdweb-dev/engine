import { type CreateServerReturnType, createServer } from "prool";
import { anvil } from "prool/instances";

let server: CreateServerReturnType | undefined;

export const startAnvil = async () => {
  console.log("Starting Anvil server...");
  const server = createServer({
    instance: anvil(),
    port: 8545,
  });
  await server.start();
};

export const stopAnvil = async () => {
  if (server) {
    console.log("Stopping Anvil server...");
    await server.stop();
  }
};
