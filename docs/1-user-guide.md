# thirdweb Engine User Guide

## Getting Started

### Environment Variables

| Variable Name                      | Description                                                                                                         | Default Value                                                        | Required |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------- |
| `THIRDWEB_API_SECRET_KEY`          | thirdweb Api Secret Key (get it from thirdweb.com/dashboard)                                                        |                                                                      | ✅       |
| `POSTGRES_CONNECTION_URL`          | PostgreSQL Connection string                                                                                        | postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable | ✅       |
| `HOST`                             | Host name of the API Server                                                                                         | `localhost`                                                          | ❌       |
| `PORT`                             | Port number of the API Server                                                                                       | `3005`                                                               | ❌       |
| `TRANSACTIONS_TO_BATCH`            | Number of transactions to batch process at a time.                                                                  | `10`                                                                 | ❌       |
| `CHAIN_OVERRIDES`                  | Pass your own RPC urls to override the default ones. This can be file or an URL. See example override-rpc-urls.json |                                                                      | ❌       |
| `OPENAPI_BASE_ORIGIN`              | Base URL for Open API Specification. Should be the Base URL of your App.                                            | `http://localhost:3005`                                              | ❌       |
| `MINED_TX_CRON_ENABLED`            | Flag to indicate whether to run the cron job to check mined transactions.                                           | `true`                                                               | ❌       |
| `MINED_TX_CRON_SCHEDULE`           | Cron Schedule for the cron job to check mined transactions.                                                         | `*/30 * * * *`                                                       | ❌       |
| `MIN_TX_TO_CHECK_FOR_MINED_STATUS` | Number of transactions to check for mined status at a time.                                                         | `50`                                                                 | ❌       |

### Setup Instructions

1. Create a `.env` file based off `.env.example` with all the variables filled in.
2. Update the `THIRDWEB_API_SECRET_KEY` value on the `.env` file
3. Update the `POSTGRES_CONNECTION_URL` value on the `.env` file

### PostgreSQL DB

A PostgreSQL DB is required to run _Engine_, both the server and worker need access to it. Check [installation guide](./addons/installations.md) for more details.

Once you have PostgreSQL DB running set the POSTGRES_CONNECTION_URL environment variable:

`postgresql://[username]:[password]@[host]:[port]/[database_name]?[option_attribute=option_value]`

### Authentication

| Required |
| -------- |

All Requests need to have `Authorization` header with the value of `Bearer <YOUR_THIRDWEB_API_SECRET_KEY>`.

### Wallet Setup

| Required |
| -------- |

Web3-api enables you to create and use backend wallets. To get started create your first wallet:

#### Creating Backend Wallets

Backend wallets are used by the web3-api to execute transactions, you should think of these as owned by the developer who's running the server.

1.POST /create/wallet
`{
  "walletType": "aws-kms | gcp-kms | local"
}`

#### AWS KMS Wallet

Check the [AWS KMS setup guide](./kms/aws_kms_how_to.md) for more details.

#### Google KMS Wallet

Check the [Google KMS setup guide](./kms/google_kms_how_to.md) for more details.

### Websocket Listener

For updates on your requests, you can either poll using the `get` (`/tranasction/status/<queueId>`) method or use websockets. [How to use websockets](./4-websocket-guide.md)

## Running in Production Mode

### Run Docker Image

| Required: Docker, Postgres |
| -------------------------- |

1. Check [Setup Instruction section](#setup-instructions) to update the `.env` file
2. Check [Advance Setup : PostgreSQL DB](#advance-setup--postgresql-db) section to update the `.env` file
3. Run the below command
   <br />
   ```
   docker run -e .env -p 3005:3005 thirdweb/engine:nightly
   # check other images at https://hub.docker.com/r/thirdweb/engine/tags
   ```

### Run on Cloud

#### Zeet Example:

1. Goto https://zeet.co/ and create an account
2. Create a new project
3. Select `Docker Image` as the deployment method
4. Under `Docker Image`, search for `thirdweb/engine` and select it
5. Under `Docker Image Tag`, select either `latest` or `nightly`
   ![Alt text](./images/Zeet-Docker-Source-Setting.png)
6. Select the Target cluster you want the above image to be deployed to
7. Choose your `Computer` settings
8. Update the `port` under `Networking` Tab to `3005`
9. Under `Environment Vriables` add the below vars with values:

```
POSTGRES_CONNECTION_URL
THIRDWEB_API_SECRET_KEY
```

10. Under `Organize` Tab,

- you can select an existing `group`` or create a new one
- you can select an existting `sub-group` or create new one
- Add a Project Name

11. Click on `Deploy` button
12. Once the deployment is complete, you can click on the URL given by zeet to access the API & Swagger UI

### Note:

To access the Swagger UI locally on `http://localhost:3005/` when using the docker image, you need to update add the following to the `.env` file:

```
NODE_ENV=development
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
3. Run: `yarn install`
4. Run: `yarn dev:server & yarn dev:worker`

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

To access the Swagger UI locally on `http://localhost:3005/` when using the docker image, you need to update add the following to the `.env` file:

### Note:

To access the Swagger UI locally on `http://localhost:3005/` when using the docker image, you need to update add the following to the `.env` file:

```
NODE_ENV=development
```

</details>
