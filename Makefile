.PHONY: build


SHELL := /bin/bash

test-evm: FORCE
	docker compose -f docker-compose-test.yml up -d
	# docker start hh-node || docker run --name hh-node -d -v ./hardhat.config.js:/hardhat/hardhat.config.js -p 8545:8545 ethereumoptimism/hardhat
	# docker start pg-node || docker run --name pg-node -d -p 5432:5432 -e POSTGRES_DATABASE_NAME=postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres:latest
	./scripts/waitForHardhatNode.sh
	yarn test:all
	docker compose -f docker-compose-test.yml down

FORCE: ;
