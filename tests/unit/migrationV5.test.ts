import { describe, expect, it } from "vitest";

import { getSdk } from "../../src/shared/utils/cache/get-sdk";
import { getChain } from "../../src/shared/utils/chain";
import { thirdwebClient } from "../../src/shared/utils/sdk";
import { getWalletBalance } from "thirdweb/wallets";
import { getBalance } from "thirdweb/extensions/erc20";
import { getContractEvents } from "thirdweb";
import {
  getContract as getContractV5,
  GetContractEventsResult,
} from "thirdweb";
import { getContract as getContractV4 } from "../../src/shared/utils/cache/get-contract";

import superjson from "superjson";
import { BigNumber } from "ethers";

/**
 * need to pass THIRDWEB_API_SECRET_KEY as env when running test case
 * THIRDWEB_API_SECRET_KEY=<secret> npx vitest run tests/unit/migrationV5.test.ts
 *
 * todo: remove all dependencies including tests after everything is migrated properly.
 */
describe("migration from v4 to v5", () => {
  it("get-contract: check difference in contract interface", async () => {
    const chainId = 137;
    const contractAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const walletAddress = "0xE52772e599b3fa747Af9595266b527A31611cebd";

    // v4
    const sdk = await getSdk({ chainId });
    const contractV4 = await sdk.getContract(contractAddress);
    const balV4 = await contractV4.erc20.balanceOf(walletAddress);

    /**
     * v5
     * Doesnt have nested helper functions and is separated into individual "extensions"
     */
    const contractV5 = getContractV5({
      client: thirdwebClient,
      address: contractAddress,
      chain: await getChain(chainId),
    });
    const balV5 = await getBalance({
      contract: contractV5,
      address: walletAddress,
    });

    expect(balV4.name).eq(balV5.name);
    expect(balV4.symbol).eq(balV5.symbol);
    expect(balV4.decimals).eq(balV5.decimals);
    expect(balV4.displayValue).eq(balV5.displayValue);
    expect(balV4.value.toString()).eq(balV5.value.toString());
  });

  it("tests for get-balance(native token)", async () => {
    const chainId = 137;
    const walletAddress = "0xE52772e599b3fa747Af9595266b527A31611cebd";

    // v4
    const sdk = await getSdk({ chainId });
    const balanceV4 = await sdk.getBalance(walletAddress);

    // v5.
    const balanceV5 = await getWalletBalance({
      client: thirdwebClient,
      address: walletAddress,
      chain: await getChain(chainId),
    });

    expect(balanceV4.name).eq(balanceV5.name);
    expect(balanceV4.symbol).eq(balanceV5.symbol);
    expect(balanceV4.decimals).eq(balanceV5.decimals);
    expect(balanceV4.displayValue).eq(balanceV5.displayValue);
    expect(balanceV4.value.toString()).eq(balanceV5.value.toString());
  });

  it("tests for events/get-all", async () => {
    const chainId = 137;
    const contractAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const fromBlock = 65334800;
    const toBlock = 65334801;
    const order = "asc";

    // v4
    const contractV4 = await getContractV4({ chainId, contractAddress });
    const eventsV4 = await contractV4.events.getAllEvents({
      fromBlock,
      toBlock,
      order,
    });
    // console.log(eventsV4);

    // v5.
    const contractV5 = getContractV5({
      client: thirdwebClient,
      address: contractAddress,
      chain: await getChain(chainId),
    });
    const eventsV5 = mapEventsV4ToV5(
      await getContractEvents({
        contract: contractV5,
        fromBlock: BigInt(fromBlock),
        toBlock: BigInt(toBlock),
      }),
      order,
    );

    expect(eventsV4.length).eq(eventsV5.length);
    for (let i = 0; i < eventsV4.length; i++) {
      expect(eventsV4[i].transaction.transactionHash).eq(
        eventsV5[i].transaction.transactionHash,
      );
    }
  });

  /**
   * Mapping of events v5 response to v4 for backward compatiblity.
   * Clients may be using this api and dont want to break things.
   */
  const mapEventsV4ToV5 = (eventsV5, order) => {
    if (!eventsV5?.length) return [];

    return eventsV5
      .map((event) => {
        const eventName = event.eventName;
        const data = {};

        // backwards compatibility of BigInt(v5) to BigNumber (v4)
        Object.keys(event.args).forEach((key) => {
          let value = event.args[key];
          if (typeof value == "bigint") {
            value = BigNumber.from(value.toString());
          }
          data[key] = value;
        });

        delete event.eventName;
        delete event.args;
        const transaction = event;
        transaction.blockNumber = parseInt(transaction.blockNumber);
        transaction.event = eventName;

        return {
          eventName,
          data,
          transaction,
        };
      })
      .sort((a, b) => {
        return order === "desc"
          ? b.transaction.blockNumber - a.transaction.blockNumber
          : a.transaction.blockNumber - b.transaction.blockNumber;
      });
  };
});
