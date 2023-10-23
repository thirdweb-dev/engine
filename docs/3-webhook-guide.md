## Webhooks

Engine now supports Webhooks to allow you to subscribe to event notifications. You can subscribe to events such as when a transaction is mined, when a transaction is sent, when a transaction is queued, backend-wallet balance etc.

> NOTE: We only support `https` URLs for webhooks & `http://localhost` URLs for local development.

### Supported Webhook Events

| Event Type               | Description                                                                      |
| ------------------------ | -------------------------------------------------------------------------------- |
| `All_Transaction`        | Subscribe to all transaction events (Queued, Sent, Mined, Errored, Retried).     |
| `Queued_Transaction`     | When a transaction is queued on event.                                           |
| `Sent_Transaction`       | When a transaction is sent to the network.                                       |
| `Mined_Transaction`      | When a transaction is mined on the network.                                      |
| `Errored_Transaction`    | When a transaction is errored out.                                               |
| `Retried_Transaction`    | When a transaction is retried.                                                   |
| `Cancelled_Transaction`  | When a transaction is cancelled.                                                 |
| `Backend_Wallet_Balance` | When the backend-wallet balance is below `minWalletBalance` Configuration Value. |

### Setup

#### Backend Wallet Balance Webhook

Update the `minWalletBalance` configuration value to the minimum balance you want to maintain in the backend-wallet. By Default the value is `2000000000000000 wei`. Once the balance goes below the configured value, a webhook will be sent to the configured URL. This can be done via the end-point `/configuration/backend-wallet-balance`.

> NOTE: Backend Wallets with low balance will not be able to send transactions, untill the balance is topped up.

#### Transaction Webhook

Use the `/webooks/create` end-point to create a webhook. The payload will be sent to the configured URL when the event occurs. The payload will be sent as `POST` request with `Content-Type: application/json` header.

### Webhook Signature & Security

To make it more secure, you can verify that the request originated from your Engine instance by checking the signature and timestamp.

The payload will be signed with the webhook secret. The signature will be sent as `X-Engine-Signature` header in the request. You can verify the signature using `isValidSignature`. The timestamp will be sent as `X-Engine-Timestamp` header in the request. You can verify the timestamp using `isExpired`. The timestamp will expire after 5 minutes.

### Signature Verification

The payload will be signed with the webhook secret. The signature will be sent as `X-Engine-Signature` header in the request. You can verify the signature using `isValidSignature` the below code:

```ts
const generateSignature = (
  body: string,
  timestamp: string,
  secret: string,
): string => {
  const payload = `${timestamp}.${body}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

const isValidSignature = (
  body: string,
  timestamp: string,
  signature: string,
  secret: string,
): boolean => {
  const expectedSignature = generateSignature(body, timestamp, secret);
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature),
  );
};
```

### Timestamp Verification

The timestamp will be sent as `X-Engine-Timestamp` header in the request. You can verify the timestamp using the below code:

```ts
export const isExpired = (
  timestamp: string,
  expirationTimeInSeconds: number,
): boolean => {
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime - parseInt(timestamp) > expirationTimeInSeconds;
};
```

### Sample Webhook Listener Code

Webhook listeners receive requests and process event data.

Below is a sample code in NodeJS. It listens for event notifications on the `/webhook` end-point.

```ts
import express from "express";
import bodyParser from "body-parser";
import { isValidSignature, isExpired } from "./webhookHelper";

const app = express();
const port = 3000;

const WEBHOOK_SECRET = "YOUR_WEBHOOK_AUTH_TOKEN"; // Replace with your secret

app.use(bodyParser.text());

app.post("/webhook", (req, res) => {
  const signatureFromHeader = req.header("X-Engine-Signature");
  const timestampFromHeader = req.header("X-Engine-Timestamp");

  if (!signatureFromHeader || !timestampFromHeader) {
    return res.status(401).send("Missing signature or timestamp header");
  }

  if (
    !isValidSignature(
      req.body,
      timestampFromHeader,
      signatureFromHeader,
      WEBHOOK_SECRET,
    )
  ) {
    return res.status(401).send("Invalid signature");
  }

  if (isExpired(timestampFromHeader, 300)) {
    // Assuming expiration time is 5 minutes (300 seconds)
    return res.status(401).send("Request has expired");
  }

  // Process the request
  res.status(200).send("Webhook received!");
});

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
```

### Payload Example

The payload sent to the webhook URL will be in the below format:

```json

# Transaction Events

{
  "chainId": 80001,
  "data": "0xa9059cbb0000000000000000000000003ecdbf3b911d0e9052b64850693888b008e183730000000000000000000000000000000000000000000000000000000000000064",
  "value": "0x00",
  "gasLimit": "39580",
  "nonce": 1786,
  "maxFeePerGas": "2063100466",
  "maxPriorityFeePerGas": "1875545856",
  "fromAddress": "0x3ecdbf3b911d0e9052b64850693888b008e18373",
  "toAddress": "0x365b83d67d5539c6583b9c0266a548926bf216f4",
  "gasPrice": "1875545871",
  "transactionType": 2,
  "transactionHash": "0xc3ffa42dd4734b017d483e1158a2e936c8a97dd1aa4e4ce11df80ac8e81d2c7e",
  "signerAddress": null,
  "accountAddress": null,
  "target": null,
  "sender": null,
  "initCode": null,
  "callData": null,
  "callGasLimit": null,
  "verificationGasLimit": null,
  "preVerificationGas": null,
  "paymasterAndData": null,
  "userOpHash": null,
  "functionName": "transfer",
  "functionArgs": "0x3ecdbf3b911d0e9052b64850693888b008e18373,100",
  "extension": "none",
  "deployedContractAddress": null,
  "deployedContractType": null,
  "queuedAt": "2023-09-29T22:01:31.031Z",
  "processedAt": "2023-09-29T22:01:38.754Z",
  "sentAt": "2023-09-29T22:01:41.580Z",
  "minedAt": "2023-09-29T22:01:44.000Z",
  "cancelledAt": null,
  "retryCount": 0,
  "retryGasValues": false,
  "retryMaxPriorityFeePerGas": null,
  "retryMaxFeePerGas": null,
  "errorMessage": null,
  "sentAtBlockNumber": 40660021,
  "blockNumber": 40660026,
  "queueId": "1411246e-b1c8-4f5d-9a25-8c1f40b54e55",
  "status": "mined"
}
```
