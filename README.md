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

1. run `yarn install`
2. Create a `.env` file and add all the environment variables from `.example.env`. (WALLET_PRIVATE_KEY and THIRDWEB_API_KEY are the 2 most important ones)
3. Update the `THIRDWEB_API_KEY` value on the `.env` file
4. Run: `yarn dev:infra`
5. Run: `yarn dev:server`
6. Run: `yarn dev:worker`

Locally, we use `docker-compose` to spin up the supporting infra services, a postgres database, the pg-admin GUI and swaggerui altogether.

The API defaults to `http://localhost:3005`.

## Running with docker

| Required: A PostgreSQL running instance. |
| ---------------------------------------- |

1. If you don't have one already, run a postgres instance: `docker run postgres`.
2. Create a `.env` file based off `.example.env` with all the variables filled in.
3. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
4. Update the `THIRDWEB_API_KEY` value on the `.env` file
5. Run `docker run thirdweb/web3-api:0.1.0 --env-file ./.env`.

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
