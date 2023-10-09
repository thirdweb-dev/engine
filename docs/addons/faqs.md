## Frequently Asked Questions

1. [What is `tx_overrides`? Do I need to pass it?](#what-is-`tx_overrides`?-do-I-need-to-pass-it)
2. [How to set Open API Base URL?](#how-to-set-open-api-base-url)
3. [How to set the RPC URLs?](#how-to-set-the-rpc-urls)
4. [Cannot connect to the Postgres DB?](#cannot-connect-to-the-postgres-db)

### What is `tx_overrides`? Do I need to pass it?

_`tx_overrides` is an optional parameter that can be passed in the body of write (on-chain transactions) end-points. It is used to override the gas values & `value` property of the blockchain transaction. If you do not pass this parameter, the default values are used._

### How to set Open API Base URL?

_Set the `OPENAPI_BASE_ORIGIN` environment variable to the base URL of your app. This is used to generate the Open API Specification and allows Swagger UI interaction. The default value is `http://localhost:3005`._

### How to set the RPC URLs?

_Set the `CHAIN_OVERRIDES` environment variable to the path of the JSON file or URL (file hosted somewhere on the internet) containing the RPC URLs. The default value is `./chain-overrides.json`. Check the [example file](../chain-overrides.example.json) for the format._

### Cannot connect to the Postgres DB?

_Check the following things:_

- Check if the Postgres DB is running.
  - If DB running on Docker:
    - In same container, check if the `host` in the `POSTGRES_CONNECTION_URL` is set to `localhost`
    - In different container, check if the `host` in the `POSTGRES_CONNECTION_URL` is set to `host.docker.internal`.
- Check if the Postgres DB connection URL with credentials is correct.
- Check if the database-name exists on the Postgres DB. If not, create a new database with the name.
