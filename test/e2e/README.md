# engine e2e test suite
## Configuration
1. Create a `.env.test` file (use `.env.test.example` as a template) and fill in the necessary values.
2. Check `config.ts` to configure the test suite.
3. Run `bun test` within the directory to run the tests.

Note: make sure `engine` is running, and `anvil` is installed if running the tests on a local environment. (You can get the latest version of `anvil` by installing [`forge`](https://book.getfoundry.sh/getting-started/installation))

## Running tests
The test suite depends on a local SDK to run tests. To run the tests, you need to generate the SDK. To do this, run the following command from the root of the repository:

```bash
yarn generate:sdk
```
Run all subsequent commands from the `test/e2e` directory.

Some tests contains load tests which take a long time to run. To ensure they don't timeout, use the following command:

```bash
bun test --timeout 300000
```

To run a specific test, use the following command:

```bash
bun test tests/<test_name>.test.ts
```