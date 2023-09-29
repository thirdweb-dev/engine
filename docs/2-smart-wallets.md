## Smart Wallets

You can use engine to deploy, manage, and transact with smart wallets on behalf of your users.

Make sure to read the `README.md` and previous `user-guide.md` before starting this one.

### 1. Deploy an account factory

In order to deploy smart wallet accounts (which we'll refer to as "accounts" from here on), you'll need an `AccountFactory` contract deployed. This contract handles deploying individual `Account` contracts for your users.

**Endpoint:** `POST - /deploy/{chain}/deployer.thirdweb.eth/AccountFactory`

**Payload:**

```json
{
  "constructorParams": ["0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"]
}
```

### 2. Deploy accounts for your users

Once you have a factory setup, you can use it to deploy accounts for your users.

**Endpoint:** `POST - /contract/{chain}/{account_factory_address}/account-factory/create-account`

```json
{
  "admin_address": "0x..." // The user wallet address that you want to deploy a smart wallet for
}
```

This will add the `admin_address` as the primary admin that can act on behalf of the newly deployed account.

If you want to control the account with one of your backend wallets, you can specify the backend wallet in the `admin_address` field.

### 3. Grant permissions and sessions

You can manage the permissions of who has control over a smart wallet.

You can grant & revoke admins on your account with the `/contract/{chain}/{account_address}/account/admins` endpoints.

You can grant & revoke sessions on your account which allow specific wallets to interact with specified contracts for a given period of time with the `/contract/{chain}/{account_address}/account/sessions` endpoints.

### 4. Transact with an account

You can make write calls with a smart account by calling any of the write endpoints and specifying both the `x-backend-wallet-address` and `x-account-address` headers.

The `x-backend-wallet-address` should be set to the engine backend wallet that is an admin over the account.

The `x-account-address` should be set to the deployed account address itself.

Write calls made using these headers will initiate a `UserOperation` sent from the specified account.
