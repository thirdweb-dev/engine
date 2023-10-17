## Webhooks

Engine now supports Webhooks to allow you to get updates on all activity happening w.r.t your requests.

Make sure to read the `README.md` and previous `user-guide.md` before starting this one.

### Setup

Add the below variable (Either on `.env` file or as environment variables)

```
WEBHOOK_URL=<your_web_hook_url>
```

The webhook URL needs to be a `POST` method to accept the data being sent.

### Authentication

The webhook URL will be sent with a 'Authorization' header with the value as `Bearer <webhook_auth_bearer_token>`. The value of the token will be the same as the `WEBHOOK_AUTH_BEARER_TOKEN` environment variable. You can set this variable to any value you want.

```
# env variable
WEBHOOK_AUTH_BEARER_TOKEN=<your_web_hook_auth_token>
```

### Payload

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
