<p align="center">
    <br />
    <a href="https://thirdweb.com">
        <img src="https://github.com/thirdweb-dev/js/blob/main/packages/sdk/logo.svg?raw=true" width="200" alt=""/></a>
    <br />
</p>

<h1 align="center"><a href='https://thirdweb.com/'>thirdweb</a> Web3-API Repo</h1>

<p align="center">
    <a href="https://github.com/thirdweb-dev/web3-api/actions/workflows/e2eTest.yml">
        <img alt="Build Status" src="https://github.com/thirdweb-dev/web3-api/actions/workflows/e2eTest.yml/badge.svg"/>
    </a>
    <a href="https://discord.gg/thirdweb">
        <img alt="Join our Discord!" src="https://img.shields.io/discord/834227967404146718.svg?color=7289da&label=discord&logo=discord&style=flat"/>
    </a>
</p>

<p align="center"><strong>Best in class web3 SDKs for Browser, Node and Mobile apps</strong></p>

## Web3API

HTTP server that provides production grade web3 functionality:

- http interface with server and client authentication
- create & interface with backend web3 wallets (local, aws kms, google kms, smart wallets, etc)
- automatic wallet nonce management
- built in high performance transaction queueing
- intelligent transaction retry and gas management
- read, write and deploy any smart contract on any evm blockchain
- create gasless relayers
- fine grained controls over user access
- run in your own cloud or managed service (coming soon)

The server is meant to facilitate blockchain transactions within your existing architecture. The server provides a high performance, production grade server to interact with smart contracts on any evm blockchain. The project is still early so if you're looking for specific features, have bugs or feedback feel free to reach out.

## Requirements

1. Docker
2. PostgreSQL DB

## Getting Started

### Set up required Environment Variables

Set these variables in the .env file (copy .env.example to get started)

| Variable Name             | Description                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `THIRDWEB_SDK_SECRET_KEY` | Create an API KEY on thirdweb Dashboard and copy the SecretKey.                                               |
| `POSTGRES_CONNECTION`     | Postgres connection string, format: postgresql://[user[:password]@][host][:port][/dbname][?param1=value1&...] |

### Run the server

Docker

```
docker run -e .env thirdweb/web3-api
```

### Using the server

- In development mode, go to the server url to see an admin interface
- Every request to the server requires an authentication token, for admin actions use the thirdweb SecretKey. Use the `Authorization` Header to set the value shown below:
  - `Authorization: Bearer: <thirdweb SecretKey>`
- Contract API

  - Read from any contract
    - GET /contract/[network]/[contract_address]/[func or variable name]
  - Write to any contract function
    - POST /contract/[network]/[contract_address]/[function name]
    - JSON body with params
  - Deploy published contracts
    - POST /deploy/[network]/[publisher_address]/[published_name]

- Wallet API (in development)

  - Create Wallets
    - POST /wallet
  - Get Wallet Info
    - Balances - GET /wallet/[wallet_address]

- Auth API (In development)
- Relayer API (In development)

## Local Development

### Requirements

1. Nodesjs (>= v18)
2. Docker
3. PostgreSQL DB

### Install

```
yarn
```

### Run:

```
yarn dev
```

This command runs the server, worker and sets up a postgres db, for fine grained control you can use these individually:

```
yarn dev:server
yarn dev:worker
yarn dev:infra
```

## User Guide

View all end-points details (Open API Specification) : [User Guide](./docs/UserGuide.md)

## API Documentation

View all end-points details (Open API Specification) : https://web3-api-akbv.chainsaw-dev.zeet.app

## Contributing

We welcome contributions from all developers, regardless of experience level. If you are interested in contributing, please read our [Contributing Guide](./.github/contributing.md) where you'll learn how the repo works, how to test your changes, and how to submit a pull request.

## Community

The best place to discuss your ideas, ask questions, and troubleshoot issues is our [Discord server](https://discord.gg/thirdweb).

## Security

If you believe you have found a security vulnerability in any of our packages, we kindly ask you not to open a public issue; and to disclose this to us by emailing `security@thirdweb.com`.
