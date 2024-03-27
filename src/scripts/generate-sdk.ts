import { execSync, spawn } from "child_process";
import fs from "fs";

async function main() {
  const child = spawn("bun", ["dev"], { detached: true });
  if (!child.pid) return;

  await new Promise((resolve) => setTimeout(resolve, 10000));
  process.kill(-child.pid);

  execSync(
    "bunx openapi --input ./dist/openapi.json --output ./sdk/src --name Engine",
  );

  const code = fs
    .readFileSync("./sdk/src/Engine.ts", "utf-8")
    .replace(`export class Engine`, `class EngineLogic`).concat(`
export class Engine extends EngineLogic {
  constructor(config: { url: string; accessToken: string; }) {
    super({ BASE: config.url, TOKEN: config.accessToken });
  }
}
`);
  fs.writeFileSync("./sdk/src/Engine.ts", code);
}

main();
