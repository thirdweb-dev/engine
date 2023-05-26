# 🔑 web3-api & worker server

Thirdweb's Web3-API & Worker server.

||
|--|
|NOTE: Update ENV vaiables as per your settings/environment.|
||

## Requirements

1. Docker
2. Nodesjs (>= v18)
3. PostgreSQL
4. ENV Variables (Check `.example.env`)
5. PG-Admin (Optional. PostgreSQL GUI)

## Running locally

||
|--|
|NOTE: Do not run `yarn install` |
||

1. Create a `.env` file and add all the environment variables from `.example.env`.
2. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
3. Update the `THIRDWEB_API_KEY` value on the `.env` file
4. Run: `yarn infra`

Locally, we use `docker-compose` to spin up the services, a postgres database and the pg-admin GUI altogether.

The API will be accessible on `http://localhost:3005` by default.

## Running with docker

||
|--|
|Required: A PostgreSQL running instance. |
||

1. If you don't have one already, run a postgres instance: `docker run postgres`.
2. Create a `.env` file based off `.example.env` with all the variables filled in.
3. Update the `WALLET_PRIVATE_KEY` value on the `.env` file
4. Update the `THIRDWEB_API_KEY` value on the `.env` file
5. Run `docker run thirdweb/web3-api:0.1.0 --env-file ./.env`.

## Running on a server

||
|--|
|Required: A PostgreSQL running instance. |
||

1. Clone the project on the remote server
2. Create a `.env` file based off `.example.env` with all the variables filled in.
3. Run: `yarn install`
4. Run: `yarn build && yarn build-worker`
5. Run: `yarn start`

This will only run the required services. You will need to have a running postgres database that can be accessed from those services.

## Docs

You can view a live version of the Swagger documentation at: https://web3-api-akbv.chainsaw-dev.zeet.app

When running locally, the swagger docs are automatically deployed at `http://localhost:3005` or your remote server URL.

## Data Inpection

In local development, you can inspect your databaes through PG-Admin (Optional) at `http://localhost:5050`.
