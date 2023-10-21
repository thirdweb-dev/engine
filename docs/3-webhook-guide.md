## Webhooks

Engine now supports Webhooks to allow you to get updates on all activity happening w.r.t your requests.

Make sure to read the `README.md` and previous `user-guide.md` before starting this one.

### Setup

To setup a webhook, you need to create a webhook URL. You can create a webhook URL using the end-points available in the `Webhooks` section of the API.

### Signature Verification

The payload will be signed with the webhook secret. The signature will be sent as `X-Signature` header in the request. You can verify the signature using `isValidSignature` the below code:

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

The timestamp will be sent as `X-Timestamp` header in the request. You can verify the timestamp using the below code:

```ts
export const isExpired = (
  timestamp: string,
  expirationTimeInSeconds: number,
): boolean => {
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime - parseInt(timestamp) > expirationTimeInSeconds;
};
```

### Sample Webhook Server Code

```ts
const WEBHOOK_SECRET = "YOUR_WEBHOOK_AUTH_TOKEN";

app.post("/webhook", (req, res) => {
  const signatureFromHeader = req.header("X-Signature");
  const timestampFromHeader = req.header("X-Timestamp");

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
```

### Payload Example

The payload sent to the webhook URL will be in the below format:

```json
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

### Statuses

The status of the request will be sent as `status` in the payload. The possible values are:

- `queued`: The request is queued and waiting to be sent.
- `sent`: The request is sent to the network.
- `mined`: The request is mined on the network.
- `cancelled`: The request is cancelled.
- `errored`: The request is errored out.
