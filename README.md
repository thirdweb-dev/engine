# 🔑 web3-api

Thirdweb's Web3-API server.

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