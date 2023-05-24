# 🔑 web3-api & worker server

Thirdweb's Web3-API & Web3-Worker server.

## ENV Variables

use the below values when running locally

```
PORT=3005
OPENAPI_BASE_ORIGIN="http://localhost:3005"
HOST="0.0.0.0"
WALLET_ADDRESS="0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"
WALLET_PRIVATE_KEY="20f32da46940d6cd93ab01a3717b339f1fad5e72df72740d6c489834859dd075"
API_KEY="TEST"
DATABASE_CLIENT="pg"
POSTGRES_HOST="host.docker.internal"
DATABASE_NAME="thirdweb"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_DB_NAME="thirdweb"
POSTGRES_PORT=5432
DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres"
DB_TABLES_LIST="wallets,transactions"
WORKER_PORT=3006
WORKER_HOST="0.0.0.0"
MIN_TRANSACTION_TO_PROCESS=1
```

## Getting Started

1. Install packages: `yarn`
2. Start local Docker containers: `yarn infra`
3. Start server for local development with hot reloading: `yarn dev`

## ToDo

- [x] Fastify Server Up & Running
- [x] Dockerize the Server
- [x] Add logging capabilty with winston
- [x] Add OpenAPI/Swagger Document Generation
- [x] Add API-Key validation as middleware
- [x] Add Read End-point
- [x] Add Write End-point
- [x] Add Deployer End-point
- [x] Add Worker Server to send Tx on chain

## Note:

`docker-compose.yaml` has commented out env variables value. You will need to add a PPK of your test wallet and then you should be able to intereact with the APIs

## Example

```
Example 1:
 - function_name: balanceOf
 - args: <eth_address> // My Wallet: 0x1946267d81fb8adeeea28e6b98bcd446c8248473
 - chain_or_rpc: mumbai
 - contract_address: 0xc8be6265C06aC376876b4F62670adB3c4d72EABA
 - x-api-key : <pass_any_random_string_as_we_are_not_doing_any_checks_in_this_implementation> [future iterations will have key checking too]
 - x-wallet_id : <pass_any_random_string_as_we_are_not_doing_any_checks_in_this_implementation> [future iterations will have wallet checking/retrieval too]

Response:

{
  "result": {
    "data": "1" //Since my wallet has 1 NFT
  },
  "error": null
}

----------

Example 2:
 - function_name: name
 - args: // Leave Empty
 - chain_or_rpc: mumbai
 - contract_address: 0xc8be6265C06aC376876b4F62670adB3c4d72EABA
 - x-api-key : <pass_any_random_string_as_we_are_not_doing_any_checks_in_this_implementation> [future iterations will have key checking too]
 - x-wallet_id : <pass_any_random_string_as_we_are_not_doing_any_checks_in_this_implementation> [future iterations will have wallet checking/retrieval too]

Response:

{
  "result": {
    "data": "Mumba"
  },
  "error": null
}
```
