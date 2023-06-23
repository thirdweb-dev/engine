<p align="center">
    <br />
    <a href="https://thirdweb.com">
        <img src="https://github.com/thirdweb-dev/js/blob/main/packages/sdk/logo.svg?raw=true" width="200" alt=""/></a>
    <br />
</p>

<h1 align="center"><a href='https://thirdweb.com/'>thirdweb</a> Web3-API Repo</h1>

<p align="center">
    <!-- <a href="https://github.com/thirdweb-dev/web3-api/actions/workflows/build-test-lint.yml">
        <img alt="Build Status" src="https://github.com/thirdweb-dev/web3-api/actions/workflows/build-test-lint.yml/badge.svg"/>
    </a> -->
    <a href="https://discord.gg/thirdweb">
        <img alt="Join our Discord!" src="https://img.shields.io/discord/834227967404146718.svg?color=7289da&label=discord&logo=discord&style=flat"/>
    </a>
</p>

<p align="center"><strong>Best in class web3 SDKs for Browser, Node and Mobile apps</strong></p>

# 🔑 web3-api & worker server

Thirdweb's Web3-API & Worker server.

| NOTE: Update ENV variables as per your settings/environment. |
| ------------------------------------------------------------ |

## Requirements

1. Docker
2. Nodesjs (>= v18)
3. PostgreSQL DB
4. ENV Variables (Check `.env.example`)
5. PG-Admin (Optional. PostgreSQL DB GUI)

Check the [How to install required packages](./.github/installations.md) guide for more details.

## Running in Production Mode

### Using Published Docker Image

| Required: Docker, Postgres |
| -------------------------- |

1. If you don't have PostgreSQL already, use this docker command to run a postgres instance: `docker run --name my-local-postgres -e POSTGRES_PASSWORD=mysecretpassword -d postgres`
2. Create a `.env` file based off `.env.example` with all the variables filled in.
3. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
4. Update the `THIRDWEB_API_KEY` value on the `.env` file
5. Update the following PostgreSQL DB ENV Variables Value:

- `POSTGRES_HOST` : PostgreSQL Host Name
- `POSTGRES_DATABASE_NAME` : PostgreSQL Database Name
- `POSTGRES_USER` : PostgreSQL Username
- `POSTGRES_PASSWORD` : PostgreSQL Password
- `POSTGRES_PORT` : PostgreSQL Port (Defaults to 5432)
- `POSTGRES_USE_SSL` : Flag to indicate whether to use SSL

6. Run `docker run --env-file ./.env -p 3005:3005 thirdweb/web3-api:latest`

### Running on a Server (EC2 Instance/Google Compute/VM)

| Required: A PostgreSQL running instance. |
| ---------------------------------------- |

1. Clone the project on the remote server
2. Create a `.env` file based off `.env.example` with all the variables filled in.
3. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
4. Update the `THIRDWEB_API_KEY` value on the `.env` file
5. Update the `HOST` value on the `.env` file to `localhost`. Example: `HOST=localhost`
6. Update the following PostgreSQL DB ENV Variables Value:

- `POSTGRES_HOST` : PostgreSQL Host Name
- `POSTGRES_DATABASE_NAME` : PostgreSQL Database Name
- `POSTGRES_USER` : PostgreSQL Username
- `POSTGRES_PASSWORD` : PostgreSQL Password
- `POSTGRES_PORT` : PostgreSQL Port (Defaults to 5432)
- `POSTGRES_USE_SSL` : Flag to indicate whether to use SSL

7. Run: `yarn install`
8. Run: `yarn build && yarn copy-files`
9. Run: `yarn start`

## Local Development

| Required: Docker |
| ---------------- |

1. Clone the Repo
2. Create a `.env` file and add all the environment variables from `.env.example`. (WALLET_PRIVATE_KEY and THIRDWEB_API_KEY are the 2 most important ones)
3. Update the `THIRDWEB_API_KEY` value on the `.env` file
4. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
5. Run: `yarn install`
6. Run: `yarn dev`

The API defaults to `http://localhost:3005`

### Other ways to run locally

<details>

<summary>Click to expand</summary>

<br >

---

### 1. Docker Approach

---

| NOTE: Do not run `yarn install` |
| ------------------------------- |

In this approach we run everything, i.e., Web3-API Server & Worker, Postgres DB, PG-Admin on Docker.

1. Clone the Repo
2. Create a `.env` file and add all the environment variables from `.env.example`. (WALLET_PRIVATE_KEY and THIRDWEB_API_KEY are the 2 most important ones)
3. Update the `THIRDWEB_API_KEY` value on the `.env` file
4. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
5. Update the `HOST` value on the `.env` file to `0.0.0.0`. Example: `HOST=0.0.0.0`
6. Update the `POSTGRES_HOST` value on the `.env` file to `host.docker.internal`. Example : `POSTGRES_HOST=host.docker.internal`
7. Run: `yarn docker`

We use `docker-compose.yml` to spin up the API Server & Worker along with supporting infra services, a postgres database and the pg-admin GUI.

The API defaults to `http://localhost:3005`

---

### 2. Non - Docker Approach

---

| REQUIRED: PostgreSQL DB running instance |
| ---------------------------------------- |

1. Clone the Repo
2. Create a `.env` file and add all the environment variables from `.env.example`. (WALLET_PRIVATE_KEY and THIRDWEB_API_KEY are the 2 most important ones)
3. Update the `THIRDWEB_API_KEY` value on the `.env` file
4. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
5. Update the following PostgreSQL DB ENV Variables Value:

- `POSTGRES_HOST` : PostgreSQL Host Name
- `POSTGRES_DATABASE_NAME` : PostgreSQL Database Name
- `POSTGRES_USER` : PostgreSQL Username
- `POSTGRES_PASSWORD` : PostgreSQL Password
- `POSTGRES_PORT` : PostgreSQL Port (Defaults to 5432)
- `POSTGRES_USE_SSL` : Flag to indicate whether to use SSL

6. Run: `yarn install`
7. Run: `yarn dev:server & yarn dev:worker`

The API defaults to `http://localhost:3005`

</details>

## API Documentation

You can view the Swagger documentation at: https://web3-api-akbv.chainsaw-dev.zeet.app

## Contributing

We welcome contributions from all developers, regardless of experience level. If you are interested in contributing, please read our [Contributing Guide](./.github/contributing.md) where you'll learn how the repo works, how to test your changes, and how to submit a pull request.

## Community

The best place to discuss your ideas, ask questions, and troubleshoot issues is our [Discord server](https://discord.gg/thirdweb).

## Security

If you believe you have found a security vulnerability in any of our packages, we kindly ask you not to open a public issue; and to disclose this to us by emailing `security@thirdweb.com`.
