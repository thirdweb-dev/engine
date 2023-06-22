# 🔑 web3-api & worker server

Thirdweb's Web3-API & Worker server.

| NOTE: Update ENV variables as per your settings/environment. |
| ------------------------------------------------------------ |

## Requirements

1. Docker
2. Nodesjs (>= v18)
3. PostgreSQL
4. ENV Variables (Check `.example.env`)
5. PG-Admin (Optional. PostgreSQL GUI)

## Running locally

There are multiple ways to run Web3-API locally.

---

### 1. Docker Approach

---

| NOTE: Do not run `yarn install` |
| ------------------------------- |

In this approach we run everything, i.e., Web3-API Server & Worker, Postgres DB, PG-Admin on Docker.

1. Create a `.env` file and add all the environment variables from `.example.env`. (WALLET_PRIVATE_KEY and THIRDWEB_API_KEY are the 2 most important ones)
2. Update the `THIRDWEB_API_KEY` value on the `.env` file
3. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
4. Run: `yarn docker`

We use `docker-compose.yml` to spin up the API Server & Worker along with supporting infra services, a postgres database and the pg-admin GUI.

The API defaults to `http://localhost:3005`

---

### 2. Partial - Docker Approach

---

With this approach we run the API server & Worker on the local machine, thus using Docker only to help us run PostgreSQL, PG-Admin.

1. Create a `.env` file and add all the environment variables from `.example.env`. (WALLET_PRIVATE_KEY and THIRDWEB_API_KEY are the 2 most important ones)
2. Update the `THIRDWEB_API_KEY` value on the `.env` file
3. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
4. Update the `HOST` & `WORKER_HOST` value on the `.env` file to `localhost`. Example: `HOST=localhost`
5. Update the `POSTGRES_HOST` value on the `.env` file to `localhost`. Example: `POSTGRES_HOST=localhost`
6. Run: `yarn install`
7. Run: `yarn dev:infra`

We use `docker-compose-infra.yml` to spin up the supporting infra services, i.e., a postgres database, the pg-admin GUI altogether.

The API defaults to `http://localhost:3005`

---

### 3. Non - Docker Approach

---

| Required: A PostgreSQL running instance. |
| ---------------------------------------- |

1. Create a `.env` file and add all the environment variables from `.example.env`. (WALLET_PRIVATE_KEY and THIRDWEB_API_KEY are the 2 most important ones)
2. Update the `THIRDWEB_API_KEY` value on the `.env` file
3. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
4. Update the `HOST` value on the `.env` file to `localhost`. Example: `HOST=localhost`
5. Update the following PostgreSQL DB ENV Variables Value:

- `POSTGRES_HOST` : PostgreSQL Host Name
- `POSTGRES_DATABASE_NAME` : PostgreSQL Database Name
- `POSTGRES_USER` : PostgreSQL Username
- `POSTGRES_PASSWORD` : PostgreSQL Password
- `POSTGRES_PORT` : PostgreSQL Port (Defaults to 5432)
- `POSTGRES_USE_SSL` : Flag to indicate whether to use SSL

6. Run: `yarn install`
7. Run: `yarn dev`

The API defaults to `http://localhost:3005`

## Running using Docker Image

| Required: A PostgreSQL running instance. |
| ---------------------------------------- |

1. If you don't have one already, run a postgres instance: `docker run postgres`.
2. Create a `.env` file based off `.example.env` with all the variables filled in.
3. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
4. Update the `THIRDWEB_API_KEY` value on the `.env` file
5. Run `docker run --env-file ./.env -p 3005:3005 thirdweb/web3-api:latest`.

## Running on a server

| Required: A PostgreSQL running instance. |
| ---------------------------------------- |

1. Clone the project on the remote server
2. Create a `.env` file based off `.example.env` with all the variables filled in.
3. Run: `yarn install`
4. Run: `yarn build && yarn copy-files`
5. Run: `yarn start`

This will only run the required services. You will need to have a running postgres database that can be accessed from those services.

## Docs

You can view a live version of the Swagger documentation at: https://web3-api-akbv.chainsaw-dev.zeet.app

When running locally, the swagger docs are automatically deployed at `http://localhost:3005` or your remote server URL.

## Data Inpection

In local development, you can inspect your databaes through PG-Admin (Optional) at `http://localhost:5050`.
