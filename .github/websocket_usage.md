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
   - `<w3a_thirdweb_secret_key>`: Web3-API Thirdweb secret key

```js
const socket = new WebSocket(
  "ws://<host>:<port>/transaction/status/<queueId>?token=<w3a_thirdweb_secret_key>",
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

The console will start printing the updates on the requestId as and when they are trasmitted.

The websocket connection will be closed automatically after the last update of either `errored` or `mined` status is sent.

#### Note: `wss` can be used instead of `ws` for secure connections.
