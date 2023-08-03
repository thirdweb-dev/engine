import { BigNumberish, providers as ethersProviders } from "ethers";
import WebSocket from "ws";
import { bigNumberReplacer } from "../../server/utilities/convertor";
import { getContractInstance, getSDK } from "../sdk/sdk";

export const getWalletNonce = async (
  walletAddress: string,
  provider: ethersProviders.Provider,
): Promise<BigNumberish> => {
  try {
    const txCount = await provider.getTransactionCount(
      walletAddress,
      "pending",
    );
    return txCount;
  } catch (error) {
    throw error;
  }
};

const subscriptions = new Map<string, Map<string, Record<string, WebSocket>>>();
const providers = new Map<string, ethersProviders.Provider>();
const lastValues = new Map<string, string>();
const isQuerying = new Map<string, boolean>();
const isActive = new Map<string, boolean>();

const getNetworkSubscriptions = ({
  contractAddress,
  functionName,
  args,
}: {
  contractAddress: string;
  functionName: string;
  args?: string;
}) => {
  return `${contractAddress}-${functionName}-${args}`;
};
const getFunctionContractAddressAndArgsFromKey = (key: string) => {
  const [contractAddress, functionName, args] = key.split("-");
  return {
    contractAddress,
    functionName,
    args,
  };
};

export const addSubscription = ({
  network,
  contractAddress,
  functionName,
  websocketId,
  ws,
  args,
}: {
  network: string;
  contractAddress: string;
  functionName: string;
  websocketId: string;
  ws: WebSocket;
  args?: string;
}) => {
  const networkSubscriptionsKey = network;
  const querySubscriptionKey = getNetworkSubscriptions({
    contractAddress,
    functionName,
    args,
  });

  const networkSubscriptions = subscriptions.get(networkSubscriptionsKey);
  if (networkSubscriptions) {
    const queries = networkSubscriptions.get(querySubscriptionKey);
    if (queries) {
      queries[websocketId] = ws;
    } else {
      networkSubscriptions.set(querySubscriptionKey, { [websocketId]: ws });
    }
  } else {
    const networkSubscriptions = new Map<string, Record<string, WebSocket>>();
    networkSubscriptions.set(querySubscriptionKey, { [websocketId]: ws });
    subscriptions.set(networkSubscriptionsKey, networkSubscriptions);
  }
};

export const removeSubscription = (
  network: string,
  contractAddress: string,
  functionName: string,
  websocketId: string,
  args?: string,
) => {
  const networkSubscriptionsKey = network;
  const querySubscriptionKey = getNetworkSubscriptions({
    contractAddress,
    functionName,
    args,
  });
  const networkSubscriptions = subscriptions.get(networkSubscriptionsKey);
  if (networkSubscriptions) {
    const queries = networkSubscriptions.get(querySubscriptionKey);
    if (queries) {
      delete queries[websocketId];
      if (Object.keys(queries).length === 0) {
        console.log("no more websockets for this query, removing query");
        networkSubscriptions.delete(querySubscriptionKey);
        if (networkSubscriptions.size === 0) {
          console.log("no more queries for this network, removing network");
          subscriptions.delete(networkSubscriptionsKey);
          const provider = providers.get(networkSubscriptionsKey);
          if (provider) {
            provider.removeAllListeners();
          }
          isActive.set(networkSubscriptionsKey, false);
        }
      }
    }
    console.log(
      `Number of listeners for ${querySubscriptionKey}`,
      Object.keys(networkSubscriptions.get(querySubscriptionKey) ?? {}).length,
    );
  }
};

export const queryContracts = async (network: string, blockNumber: number) => {
  console.log(
    `querying contracts on ${network} with blockNumber ${blockNumber}`,
  );
  const networkSubscriptions = subscriptions.get(network);
  if (!networkSubscriptions) {
    return;
  }

  const queries = Array.from(networkSubscriptions.entries());
  // TODO: Use multiCall to optimize this
  const contractReads = queries.map(async ([query, webSockets]) => {
    const { contractAddress, functionName, args } =
      getFunctionContractAddressAndArgsFromKey(query);

    const isQueryingKey = network + query;
    if (isQuerying.get(isQueryingKey)) {
      console.log(
        `already querying ${contractAddress}'s ${functionName} with ${args} on ${network}, skipping`,
      );
      return;
    }
    isQuerying.set(isQueryingKey, true);

    try {
      const contract = await getContractInstance(network, contractAddress);
      let returnData = await contract.call(
        functionName,
        args ? args.split(",") : [],
      );
      returnData = bigNumberReplacer(returnData);
      console.log({ newValue: returnData, oldValue: lastValues.get(query) });
      if (lastValues.get(query) !== returnData) {
        for (const ws of Object.values(webSockets)) {
          ws.send(
            JSON.stringify({
              query: {
                contractAddress,
                functionName,
                args,
              },
              result: returnData,
            }),
          );
        }
        lastValues.set(query, returnData);
      }
    } catch (e) {
      console.log(
        `error calling ${functionName} with ${args} on ${contractAddress} `,
        e,
      );
      for (const ws of Object.values(webSockets)) {
        ws.send(
          JSON.stringify({
            query: {
              contractAddress,
              functionName,
              args,
            },
            error:
              e instanceof Error
                ? e.message
                : "Something went wrong. Check server logs for more",
          }),
        );
      }
    } finally {
      isQuerying.set(isQueryingKey, false);
    }
  });
  await Promise.all(contractReads);
  console.log(
    `Done querying contracts on ${network} with blockNumber ${blockNumber}`,
  );
};

export const startSubscription = async (network: string) => {
  const key = network;
  if (isActive.get(key)) {
    return;
  }
  isActive.set(key, true);
  const sdk = await getSDK(network);
  const provider = sdk.getProvider();
  provider.on("block", async (blockNumber) => {
    await queryContracts(network, blockNumber);
  });
  providers.set(key, provider);
};
