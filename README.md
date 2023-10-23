<p align="center">
    <br />
    <a href="https://thirdweb.com">
        <img src="https://github.com/thirdweb-dev/js/blob/main/packages/sdk/logo.svg?raw=true" width="200" alt=""/></a>
    <br />
</p>

<h1 align="center"><a href='https://thirdweb.com/'>thirdweb</a> Engine</h1>

<p align="center">
    <a href="https://discord.gg/thirdweb">
        <img alt="Join our Discord!" src="https://img.shields.io/discord/834227967404146718.svg?color=7289da&label=discord&logo=discord&style=flat"/>
    </a>
</p>

<p align="center"><strong>The most powerful backend engine for web3 apps.</strong></p>

## Table of contents

- [Introduction](#introduction)
- [Getting started](#getting-started)
  - [Setup environment variables](#setup-environment-variables)
  - [Run the server](#run-the-server)
  - [Using the server](#using-the-server)
- [Resources](#resources)
  - [Using Engine](#using-engine)
  - [Other Resources](#other-resources)
- [Security](#security)

## Introduction

thirdweb engine is a backend server that provides a HTTP interface to interact with any smart contract on any evm chain. Engine handles creating and managing backend wallets, enabling high throughput with automatic nonce and gas management.

The high level functionality of thirdweb engine:

<!-- Source: https://whimsical.com/engine-architecture-2G6rXEvUM2HFmVwKxPWyzS -->
<img src="./docs/images/overview.png" alt="Overview" width="820">

- Create & transact with **backend wallets** (Local, AWS KMS, Google KMS, etc.)
- High reliability transaction execution with **wallet nonce management**, **automatic transaction retrying** and **gas management**
- Deploy and interact with [erc-4337](https://eips.ethereum.org/EIPS/eip-4337) smart wallets, handle session keys & sending user operations
- Deploy published smart contracts (any EVM chain)
- Read, write and interact with smart contracts (any evm chain)
- Run in your own cloud or use the thirdweb managed service
- Fine-grained user access controls & wallet based client-side authentication [Coming Soon]
- Gasless relayer, bundler, and paymaster for gasless transactions [Coming Soon]

This project is in `alpha` - if you're looking for specific features & or want to give feedback, reach out to us!

## Requirements

1. Docker
2. Postgres DB

## Getting started

### Setup environment variables

Set these environment variables to get started.

| Variable Name             | Description                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `THIRDWEB_API_SECRET_KEY` | Create an API KEY on thirdweb Dashboard and copy the SecretKey.                                                  |
| `POSTGRES_CONNECTION_URL` | Postgres connection string, format: postgresql://[user[:password]@][host][:port][/dbname][?param1=value1&...]    |
| `ADMIN_WALLET_ADDRESS`    | The initial admin wallet address that can connect to this engine instance from the thirdweb dashboard for setup. |

### Run the server

Run the server using Docker with the following command.

```
docker run \
    -e THIRDWEB_API_SECRET_KEY="<your-api-secret-key>" \
    -e POSTGRES_CONNECTION_URL="<your-connection-url>" \
    -e ADMIN_WALLET_ADDRESS="<your-admin-wallet-address>" \
    -p 3005:3005 \
    thirdweb/engine:latest
```

### Using the server

- Every request to the server requires an authentication token for admin actions use the thirdweb SecretKey. Use the `Authorization` Header to set the value shown below:
  - `Authorization: Bearer <thirdweb SecretKey>`
- Every write request to the server also requires the `x-backend-wallet-address` header to specify which admin wallet to send a transaction with. Use the following format to set this header:

  - `x-backend-wallet-address: 0x3ecdbf3b911d0e9052b64850693888b008e18373`

- Here's the link to the [full API reference](https://redocly.github.io/redoc/?url=https://demo.web3api.thirdweb.com/json), or in development mode, go to the server root url to see the reference.

## Resources

#### Using Engine

- [User Guide](./docs/1-user-guide.md) - Setup an engine instance.
- [Smart Wallets Guide](./docs/2-smart-wallets.md) - Deploy, manage, and transact with smart wallets with engine.
- [Webhook Guide](./docs/3-webhook-guide.md) - Setup webhooks with engine.
- [Websocket Guide](./docs/4-websocket-guide.md) - Listen for transaction updates via websockets.
- [Load Testing Guide](./docs/addons/load-testing.md) - Load test engine for your use case.
- [AWS KMS Setup](./docs/kms/aws_kms_how_to.md) - Setup engine to use AWS KMS to manage wallets.
- [Google KMS Setup](./docs/kms/google_kms_how_to.md) - Setup engine to use Google KMS to manage wallets.

#### Other Resources

- [Frequently Asked Questions](./docs/addons/faqs.md) - The most common questions & answers.
- [Contributing to Engine](./docs/addons/contributing.md) - Contribute to this project!
- [Full API Playground](https://web3-api-akbv.chainsaw-dev.zeet.app) - Full playground to interact with engine yourself.
- [Community Discord Server](https://discord.gg/thirdweb) - Join our community to discuss ideas & issues or just to hangout 😄

## Security

If you believe you have found a security vulnerability in any of our packages, we kindly ask you not to open a public issue; and to disclose this to us by emailing `security@thirdweb.com`.
