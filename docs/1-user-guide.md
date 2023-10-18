# thirdweb Engine User Guide

## Getting Started

### Environment Variables

| Variable Name             | Description                                                                                                         | Default Value                                                        | Required |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------- |
| `THIRDWEB_API_SECRET_KEY` | thirdweb Api Secret Key (get it from thirdweb.com/dashboard)                                                        |                                                                      | ✅       |
| `POSTGRES_CONNECTION_URL` | PostgreSQL Connection string                                                                                        | postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable | ✅       |
| `HOST`                    | Host name of the API Server                                                                                         | `localhost`                                                          | ❌       |
| `PORT`                    | Port number of the API Server                                                                                       | `3005`                                                               | ❌       |
| `CHAIN_OVERRIDES`         | Pass your own RPC urls to override the default ones. This can be file or an URL. See example override-rpc-urls.json |                                                                      | ❌       |
| `OPENAPI_BASE_ORIGIN`     | Base URL for Open API Specification. Should be the Base URL of your App.                                            | `http://localhost:3005`                                              | ❌       |

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

For updates on your requests, you can either poll using the `get` (`/transaction/status/<queueId>`) method or use websockets. [How to use websockets](./4-websocket-guide.md)

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

Check the below Deployment Guides for more details:

1. [Zeet Deployment Guide](./guides//deployment/zeet-deployment.md)

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

### 1. Use only NodeJS/Yarn

---

| REQUIRED: PostgreSQL DB running instance |
| ---------------------------------------- |

1. Clone the Repo
2. Check [Setup Instruction section](#setup-instructions) to update the `.env` file
3. Update the `POSTGRES HOST` on your `POSTGRES_CONNECTION_URL` value on the `.env` file to `host.docker.internal`. Example :

```js
POSTGRES_CONNECTION_URL=postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable
```

4. Run: `yarn install`
5. Run: `yarn dev:server & yarn dev:worker`

The API defaults to `http://localhost:3005`

### 2. Use Docker Compose

---

| NOTE: Do not run `yarn install` |
| ------------------------------- |

In this approach we run everything, i.e., Web3-API Server & Worker, Postgres DB, PG-Admin on Docker.

1. Clone the Repo
2. Check [Setup Instruction section](#setup-instructions) to update the `.env` file
3. Add the below environment variables required for PostgreSQL Docker image.

```js
POSTGRES_USER = postgres;
POSTGRES_PASSWORD = postgres;
```

4. Run: `yarn docker`

We use `docker-compose.yml` to spin up the API Server & Worker along with supporting infra services, a postgres database and the pg-admin GUI.

The API defaults to `http://localhost:3005`

### 3. Use `docker run`

---

1. Check [Setup Instruction section](#setup-instructions) to update the `.env` file
2. Update the `POSTGRES HOST` on your `POSTGRES_CONNECTION_URL` value on the `.env` file to `host.docker.internal`. Example :

```js
POSTGRES_CONNECTION_URL=postgres://postgres:postgres@host.docker.internal:5432/postgres?sslmode=disable
```

3. Add the below environment variables required for PostgreSQL Docker image.

```js
POSTGRES_USER = postgres;
POSTGRES_PASSWORD = postgres;
```

4. Run the below command:

```bash
docker run -e .env -p 5432:5432 postgres:latest
```

You can check on Docker Dashboard if the container is up & running.

5. Run thirdweb Engine Docker image:

```bash
docker run -e .env -p 3005:3005 thirdweb/engine:latest
```

You can check on Docker Dashboard if the container is up & running.

The API defaults to `http://localhost:3005`

---
