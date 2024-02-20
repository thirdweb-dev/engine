## Frequently Asked Questions

1. [What is `tx_overrides`? Do I need to pass it?](#what-is-`tx_overrides`?-do-I-need-to-pass-it)
2. [How to set Open API Base URL?](#how-to-set-open-api-base-url)
3. [How to set the RPC URLs?](#how-to-set-the-rpc-urls)
4. [Cannot connect to the Postgres DB?](#cannot-connect-to-the-postgres-db)

### What is `tx_overrides`? Do I need to pass it?

_`tx_overrides` is an optional parameter that can be passed in the body of write (on-chain transactions) end-points. It is used to override the gas values & `value` property of the blockchain transaction. If you do not pass this parameter, the default values are used._

### How to set the RPC URLs?

_Use the end-point, `/configuration/chains` to SET the chain-override details for a particular chain. Chain details update are picked in the subsequent SDK calls. Check the [example file](../chain-overrides.example.json) for the format `chain-override`._

### Cannot connect to the Postgres DB?

_Check the following things:_

- Check if the Postgres DB is running.
  - If DB running on Docker:
    - In same container, check if the `host` in the `POSTGRES_CONNECTION_URL` is set to `localhost`
    - In different container, check if the `host` in the `POSTGRES_CONNECTION_URL` is set to `host.docker.internal`.
- Check if the Postgres DB connection URL with credentials is correct.
- Check if the database-name exists on the Postgres DB. If not, create a new database with the name.
