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

Engine is a backend HTTP server that calls smart contracts with your managed backend wallets.

[**Read the documentation**](https://portal.thirdweb.com/engine) for features, setup, configuration, guides, and references.

<!-- Source: https://whimsical.com/engine-architecture-2G6rXEvUM2HFmVwKxPWyzS -->
<img src="./docs/images/overview.png" alt="Overview" width="820">

## Features

- Managed backend wallets
- Contract calls and deployments ([all EVM blockchains](https://thirdweb.com/chainlist) + private subnets)
- Parallel transactions with retries
- Account abstraction with session tokens
- Gasless transactions
- Wallet and contract webhooks
- And [much more!](https://portal.thirdweb.com/engine)

## Quickstart

1. Install [Docker](https://docs.docker.com/get-docker/).
1. Run Postgres.
   ```bash
   docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres -d postgres
   ```
1. Run Engine.
   ```bash
   docker run \
     -e ENCRYPTION_PASSWORD="<encryption_password>" \
     -e THIRDWEB_API_SECRET_KEY="<thirdweb_secret_key>" \
     -e ADMIN_WALLET_ADDRESS="<admin_wallet_address>" \
     -e POSTGRES_CONNECTION_URL="postgresql://postgres:postgres@host.docker.internal:5432/postgres?sslmode=disable" \
     -e ENABLE_HTTPS=true \
     -p 3005:3005 \
     --pull=always \
     --cpus="0.5" \
     thirdweb/engine:latest
   ```
1. Navigate to the [Engine dashboard](https://thirdweb.com/dashboard/engine).
   - CORS error? Load https://localhost:3005 in your browser first.
1. Create or import a [local wallet](https://portal.thirdweb.com/engine/backend-wallets).

Learn more: [Getting Started](https://portal.thirdweb.com/engine/getting-started)

> **Production:** Deploy Postgres and Engine to your cloud provider. Consider creating [KMS backend wallets](https://portal.thirdweb.com/engine/backend-wallets).

## Contributing

We welcome external contributions! See [how to contribute to thirdweb repos]. Please try to follow the existing code style and conventions.

## Get in touch

- Support: [Join the Discord](https://discord.gg/thirdweb)
- Twitter: [@thirdweb](https://twitter.com/thirdweb)
- Report a vulnerability: security@thirdweb.com
