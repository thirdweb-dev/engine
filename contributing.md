# How to contribute

The thirdweb team welcomes contributions!

## Workflow

For OSS contributions, we use a [Forking Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/forking-workflow). Develop locally on your own fork and submit a PR to the main repo when you're ready for your changes to be reviewed.

1. [Create a fork](https://github.com/thirdweb-dev/engine/fork) of this repository to your own GitHub account.
1. [Clone your fork](https://help.github.com/articles/cloning-a-repository/) to your local machine.
1. Create a new branch on your fork to start working on your changes:

   ```bash
   git checkout -b MY_BRANCH_NAME
   ```

1. Install the dependencies:

   ```bash
   yarn install
   ```

1. Make changes on your branch.
1. Make a pull request to the `thirdweb-dev/engine:main` branch.

## Test Your Changes

Please run Engine locally to test your changes.

```bash
yarn dev
```

You should be able to make requests to Engine locally and import it to the [thirdweb dashboard](https://thirdweb.com/dashboard/engine).
