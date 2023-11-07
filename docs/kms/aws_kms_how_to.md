Thirdweb Engine supports AWS KMS for signing & sending transactions over any EVM chain. This is a guide on how to set up AWS KMS.

### Steps to set up AWS KMS

1. Create IAM user with programmatic access, see [here](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html#id_users_create_console) for more details.
2. Add create, get, read permission to KMS, see [here](https://docs.aws.amazon.com/kms/latest/developerguide/control-access.html) for more details.

```
Minimum Permissions Required:
---------------------------
kms:CreateKey
kms:GetPublicKey
kms:Sign
kms:CreateAlias
kms:Verify
```

3. Create an AWS KMS key, see [here](https://docs.aws.amazon.com/kms/latest/developerguide/create-keys.html) for more details. or, you can use the `/backend-wallet/create` to create a key.

NOTE:

If you are creating the key yourself on AWS KMS Console, then please select the below config to create a key with sign permission.

```
Key Type: Asymmetric
Key Spec: ECC_SECG_P256K1
Key Usage: Sign and verify
```

### Set up Web3-API with AWS KMS

If you are on the `latest` or `nightly` version of Web3-API, then you can use the below steps to set up AWS KMS:

1. Make sure your Engine is running with the environment variables setup, see [here](../1-user-guide.md) for more details.
2. Open `http://localhost:3005` in your browser to see the Swagger UI.
3. Open `Configurations Tab` and use the AWS Access Key ID, AWS Access Secret Key & AWS Region to setup AWS KMS.

```js
{
  "type": "aws-kms",
  "awsAccessKeyId": "<your-aws-access-key-id>",
  "awsSecretAccessKey": "<your-aws-secret-access-key>",
  "awsRegion": "<your-aws-region>"
}
```

4. Click `create` & the AWS KMS Config will be added to Engine.

Now you can Create or Import AWS KMS Wallets using the `/backend-wallet/create` or `/backend-wallet/import` endpoints.

#### For Engine Version below `v0.0.3`, use the below:

Create a `.env` file in the root directory of the project and add the below details.

```
# Required for AWS Auth
AWS_ACCESS_KEY_ID=<aws_access_key_id>
AWS_SECRET_ACCESS_KEY=<aws_secret_access_key>
AWS_REGION=<aws_region>
```
