# thirdweb web3-api User Guide

## Getting Started

### Websocket Listener

For updates on your requests, you can either poll using the `get` (`/tranasction/status/<tx_queue_id>`) method or use websockets. [How to use websockets](./.github/websocket_usage.md)

## Environment Variables

| Variable Name                      | Description                                                                                                         | Default Value           | Required |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------- |
| `HOST`                             | Host name of the API Server                                                                                         | `localhost`             | ❌       |
| `PORT`                             | Port number of the API Server                                                                                       | `3005`                  | ❌       |
| `POSTGRES_CONNECTION_URL`          | PostgreSQL Connection string                                                                                        |                         | ❌       |
| `TRANSACTIONS_TO_BATCH`            | Number of transactions to batch process at a time.                                                                  | `10`                    | ❌       |
| `CHAIN_OVERRIDES`                  | Pass your own RPC urls to override the default ones. This can be file or an URL. See example override-rpc-urls.json |                         | ❌       |
| `OPENAPI_BASE_ORIGIN`              | Base URL for Open API Specification. Should be the Base URL of your App.                                            | `http://localhost:3005` | ❌       |
| `THIRDWEB_API_SECRET_KEY`          | Create an API KEY on Thirdweb Dashboard and copy the SecretKey.                                                     |                         | ✅       |
| `MINED_TX_CRON_ENABLED`            | Flag to indicate whether to run the cron job to check mined transactions.                                           | `true`                  | ❌       |
| `MINED_TX_CRON_SCHEDULE`           | Cron Schedule for the cron job to check mined transactions.                                                         | `*/30 * * * *`          | ❌       |
| `MIN_TX_TO_CHECK_FOR_MINED_STATUS` | Number of transactions to check for mined status at a time.                                                         | `50`                    | ❌       |

## Setup Instructions

1. Create a `.env` file based off `.env.example` with all the variables filled in.
2. Update the `THIRDWEB_API_SECRET_KEY` value on the `.env` file

### Authentication

| Required |
| -------- |

All Requests need to have `Authorization` header with the value of `Bearer <YOUR_THIRDWEB_API_SECRET_KEY>` from the `.env` file.

### Wallet Setup

| Required |
| -------- |

There are multiple ways to setup a wallet for Web3-API using the below methods:

#### Wallet Private Key

1.Update the `WALLET_PRIVATE_KEY` value on the `.env` file

#### AWS KMS Wallet

1. Get the AWS KMS Support Variables which can be found in `.env.example` file
2. Update the AWS KMS ENV Variables with the correct values on `.env` file

- `AWS_ACCESS_KEY_ID` : AWS Access Key
- `AWS_SECRET_ACCESS_KEY` : AWS Secret Access Key
- `AWS_REGION` : AWS KMS Key Region
- `AWS_KMS_KEY_ID` : Needs to have the full ARN

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
