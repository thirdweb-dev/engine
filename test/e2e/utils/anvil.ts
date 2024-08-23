import { spawn, type Subprocess } from "bun";

let anvil: Subprocess | null = null;

const startAnvil = () => {
  console.log("Starting Anvil server...");
  anvil = spawn(["anvil", "-b", "2"], {
    stdout: "pipe",
    stderr: "pipe",
  });

  if (anvil.stderr && typeof anvil.stderr !== "number") {
    (async () => {
      try {
        for await (const chunk of anvil.stderr as any) {
          console.error(`ANVIL stderr: ${new TextDecoder().decode(chunk)}`);
        }
      } catch (error) {
        console.error(`Error reading from Anvil stderr: ${error}`);
      }
    })();
  }

  return anvil;
};

const cleanup = () => {
  console.log("Cleanup: Attempting to kill Anvil server...");
  if (anvil) {
    try {
      anvil.kill();
      console.log("Cleanup: Kill signal sent to Anvil process");
    } catch (error) {
      console.error(`Error while killing Anvil process: ${error}`);
    }
  } else {
    console.log("Cleanup: No Anvil process to kill");
  }
};

export const setupAnvil = () => {
  const anvilProcess = startAnvil();

  // Setup cleanup for normal exit
  process.on("exit", cleanup);

  // Handle various termination signals
  ["SIGINT", "SIGTERM", "SIGUSR1", "SIGUSR2"].forEach((signal) => {
    process.on(signal, () => {
      console.log(`Received ${signal}. Cleaning up and exiting.`);
      cleanup();
      process.exit(0);
    });
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error: Error) => {
    console.error(`Uncaught Exception: ${error}`);
    cleanup();
    process.exit(1);
  });

  console.log("Anvil setup complete. Test will run and then clean up.");

  return anvilProcess;
};
