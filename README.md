# 🔑 web3-api

Thirdweb's Web3-API server.

## ENV Variables

```
PORT=3005
OPENAPI_BASE_ORIGIN="http://localhost:3005"
HOST="0.0.0.0"
WALLET_PRIVATE_KEY="<ppk>"
API_KEY="TEST"
```

## Getting Started

1. Install packages: `yarn`
2. Start local Docker containers: `yarn infra`
3. Start server for local development with hot reloading: `yarn dev`

## ToDo

- [X] Fastify Server Up & Running
- [X] Dockerize the Server
- [X] Add logging capabilty with winston
- [ ] Add OpenAPI/Swagger Document Generation
- [X] Add API-Key validation as middleware
- [ ] Make API-Key Validation work with ThirdWeb Access check
- [ ] Add wallet-id validation as middleware
- [X] Add Read End-point
- [X] Add Write End-point
- [ ] Add Deployer End-point


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