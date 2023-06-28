import { checkTablesExistence, implementTriggerOnStartUp } from "../core";
import createServer from "../server/helpers/server";

const server = await createServer("Test-Suite");
server.log.info("Setting up the server");

await checkTablesExistence(server);
await implementTriggerOnStartUp(server);
server.log.info("Server setup done");

// import pkg from "hardhat";
// const { config } = pkg;
// console.log("Accounts from config:", config.networks.mainnet.accounts);

// const accounts = config.networks.hardhat.accounts;
// let index = 0; // first wallet, increment for next wallets
// const wallet1 = ethers.Wallet.fromMnemonic(
//   accounts[index].mnemonic,
//   accounts[index].path + `/${index}`,
// );
// const privateKey1 = wallet1.privateKey;

// console.log("Wallet 1:", accounts);
