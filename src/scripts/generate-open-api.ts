import { spawn } from "child_process";

async function main() {
  const child = spawn("yarn", ["dev:server"], { detached: true });
  if (!child.pid) return;

  await new Promise((resolve) => setTimeout(resolve, 10000));
  process.kill(-child.pid);
}

main();
