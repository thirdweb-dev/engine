## How to use websockets

For listening for updates on your requests, you can either poll using the `get` method or use websockets. This guide will help in setting up websockets.

### Requirements

- Chrome (or any explorer)

### Steps

1. Open Chrome browser
2. Open Chrome DevTools (F12)
3. Replace the below values with your own values in the below snippet and paste it in the console
   - `<host>`: Hostname of the server
   - `<port>`: Port of the server
   - `<queueId>`: Queue ID of the request
   - `<thirdweb_api_secret_key>`: Thirdweb api secret key

```js
const socket = new WebSocket(
  "ws://<host>:<port>/transaction/status/<queueId>?token=<thirdweb_api_secret_key>",
);

socket.onopen = (event) => {
  console.log("opened");
};

socket.onclose = (event) => {
  console.log("connection closed");
};

socket.onmessage = (event) => {
  const res = JSON.parse(event.data);
  res.result = JSON.parse(res.result);
  console.log("Received Data", res);
};
```

Received Data will be of the following format:

```json
{
  "message": string,
  "queueId": string,
  "result": {
    "chainId": string,
    "contractAddress": string,
    "contractType": string | null,
    "createdTimestamp": datetime,
    "deployedContractAddress": string | null,
    "encodedInputData": string,
    "errorMessage": string | null,
    "extension": string,
    "functionArgs": string,
    "functionName": string,
    "gasLimit": string | null,
    "gasPrice": string | null,
    "maxFeePerGas": string | null,
    "maxPriorityFeePerGas": string | null,
    "queueId": string | null,
    "status": string | null,
    "submittedTxNonce": string | null,
    "toAddress": string | null,
    "txErrored": boolean,
    "txHash": string,
    "txMined": boolean,
    "txProcessed": boolean,
    "txProcessedTimestamp": datetime | null,
    "txRetryTimestamp": datetime | null,
    "txSubmitted": boolean,
    "txSubmittedTimestamp": datetime | null,
    "txType": string | null,
    "updatedTimestamp": datetime | null,
    "walletAddress": string
  }
}
```

The console will start logging the updates on the queueId as and when they are transmitted.

The websocket connection will be closed automatically after the last update of either `errored` or `mined` status is sent.

#### Note: `wss` can be used instead of `ws` for secure connections.
