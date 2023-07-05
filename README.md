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

## Requirements

1. Docker
2. Nodesjs (>= v18)
3. PostgreSQL DB
4. ENV Variables (Check `.env.example`)
5. PG-Admin (Optional. PostgreSQL DB GUI)

Check the [How to install required packages](./.github/installations.md) guide for more details.

## API Documentation

View all end-points details (Open API Specification) : https://web3-api-akbv.chainsaw-dev.zeet.app

## Environment Variables

| Variable Name            | Description                                                                                                         | Default Value | Required |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------- | -------- |
| `HOST`                   | Host name of the API Server                                                                                         | `localhost`   | false    |
| `PORT`                   | Port number of the API Server                                                                                       | `3005`        | false    |
| `WALLET_PRIVATE_KEY`     | Private key of the wallet                                                                                           |               | true     |
| `THIRDWEB_API_KEY`       | API Key to access ThirdWeb API                                                                                      |               | true     |
| `POSTGRES_HOST`          | PostgreSQL Host Name                                                                                                |               | true     |
| `POSTGRES_DATABASE_NAME` | PostgreSQL Database Name                                                                                            |               | true     |
| `POSTGRES_USER`          | PostgreSQL Username                                                                                                 |               | true     |
| `POSTGRES_PASSWORD`      | PostgreSQL Password                                                                                                 |               | true     |
| `POSTGRES_PORT`          | PostgreSQL Port                                                                                                     |               | true     |
| `POSTGRES_USE_SSL`       | Flag to indicate whether to use SSL                                                                                 |               | true     |
| `TRANSACTIONS_TO_BATCH`  | Number of transactions to batch process at a time.                                                                  | `10`          | false    |
| `RPC_OVERRIDE_URI`       | Pass your own RPC urls to override the default ones. This can be file or an URL. See example override-rpc-urls.json |               | false    |

## Setup Instructions

1. Create a `.env` file based off `.env.example` with all the variables filled in.
2. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
3. Update the `THIRDWEB_API_KEY` value on the `.env` file

### Advance Setup : PostgreSQL DB

<details>

<summary>Click to expand</summary>

You will need a PostgreSQL DB running instance to run the API Server & Worker. You can either run PostgreSQL DB on cloud, on a local instance or on docker. Check [installation guide](./.github/installations.md) for more details.

Once you have PostgreSQL DB running on cloud or a local instance, update the following PostgreSQL DB ENV Variables Value on `.env` file:

- `POSTGRES_HOST` : PostgreSQL Host Name
- `POSTGRES_DATABASE_NAME` : PostgreSQL Database Name
- `POSTGRES_USER` : PostgreSQL Username
- `POSTGRES_PASSWORD` : PostgreSQL Password
- `POSTGRES_PORT` : PostgreSQL Port (Defaults to 5432)
- `POSTGRES_USE_SSL` : Flag to indicate whether to use SSL

</details>

## Running in Production Mode

### Run Docker Image

| Required: Docker, Postgres |
| -------------------------- |

1. Check [Setup Instruction section](#setup-instructions) to update the `.env` file
2. Check [Advance Setup : PostgreSQL DB](#advance-setup--postgresql-db) section to update the `.env` file
3. Run the below command
   <br />
   ```
   docker run --env-file ./.env -p 3005:3005 thirdweb/web3-api:latest
   ```

<details>
 <summary>Run on a Server (EC2 Instance/Google Compute/VM) </summary>

| Required: A PostgreSQL DB running instance. |
| ------------------------------------------- |

1. Clone the project on the remote server
2. Check [Setup Instruction section](#setup-instructions) to update the `.env` file
3. Check [Advance Setup : PostgreSQL DB](#advance-setup--postgresql-db) section to update the `.env` file
4. Update the `HOST` value on the `.env` file to `localhost`. Example: `HOST=localhost`
5. Run: `yarn install`
6. Run: `yarn build && yarn copy-files`
7. Run: `yarn start`

</details>
<br/>

## Local Development

| Required: Docker |
| ---------------- |

Note: This is the recommended way to run the API locally. It will spin up infra services, i.e., PostgreSQL DB, PG-Admin on Docker and run the API Server & Worker on local machine.

1. Clone the Repo
2. Check [Setup Instruction section](#setup-instructions) to update the `.env` file
3. Run: `yarn install`
4. Run: `yarn dev`

The API defaults to `http://localhost:3005`

We use `docker-compose-infra.yml` to spin up the supporting infra services, a postgres database and the pg-admin GUI.

### Other ways to run locally

<details>

<summary>Click to expand</summary>

<br >

---

### 1. Use only NodeJS/Yarn

---

| REQUIRED: PostgreSQL DB running instance |
| ---------------------------------------- |

1. Clone the Repo
2. Check [Setup Instruction section](#setup-instructions) to update the `.env` file
3. Check [Advance Setup : PostgreSQL DB](#advance-setup--postgresql-db) section to update the `.env` file
4. Run: `yarn install`
5. Run: `yarn dev:server & yarn dev:worker`

The API defaults to `http://localhost:3005`

---

### 2. Use Docker Compose

---

| NOTE: Do not run `yarn install` |
| ------------------------------- |

In this approach we run everything, i.e., Web3-API Server & Worker, Postgres DB, PG-Admin on Docker.

1. Clone the Repo
2. Check [Setup Instruction section](#setup-instructions) to update the `.env` file
3. Update the `HOST` value on the `.env` file to `0.0.0.0`. Example: `HOST=0.0.0.0`
4. Update the `POSTGRES_HOST` value on the `.env` file to `host.docker.internal`. Example : `POSTGRES_HOST=host.docker.internal`
5. Run: `yarn docker`

We use `docker-compose.yml` to spin up the API Server & Worker along with supporting infra services, a postgres database and the pg-admin GUI.

The API defaults to `http://localhost:3005`

</details>

## Contributing

We welcome contributions from all developers, regardless of experience level. If you are interested in contributing, please read our [Contributing Guide](./.github/contributing.md) where you'll learn how the repo works, how to test your changes, and how to submit a pull request.

## Community

The best place to discuss your ideas, ask questions, and troubleshoot issues is our [Discord server](https://discord.gg/thirdweb).

## Security

If you believe you have found a security vulnerability in any of our packages, we kindly ask you not to open a public issue; and to disclose this to us by emailing `security@thirdweb.com`.
