.PHONY: build

SHELL := /bin/bash

export NODE_ENV=testing
export THIRDWEB_API_KEY=TEST
export POSTGRES_HOST=localhost
export POSTGRES_DATABASE_NAME=postgres
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_PORT=5432
export POSTGRES_USE_SSL=false
export WALLET_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

test: FORCE
	docker compose -f docker-compose-test.yml up -d
	# docker start hh-node || docker run --name hh-node -d -v ./hardhat.config.js:/hardhat/hardhat.config.js -p 8545:8545 ethereumoptimism/hardhat
	# docker start pg-node || docker run --name pg-node -d -p 5432:5432 -e POSTGRES_DATABASE_NAME=postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:latest
	./scripts/waitForHardhatNode.sh
	yarn test:all
	docker compose -f docker-compose-test.yml down

FORCE: ;
