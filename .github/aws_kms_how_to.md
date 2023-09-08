Web3-API supports AWS KMS for signing & sending transactions over any EVM chain. This is a guide on how to set up AWS KMS for Web3-API.

### Steps to set up AWS KMS

1. Create IAM user with programmatic access, see [here](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html#id_users_create_console) for more details.
2. Add create, get, read permission to KMS, see [here](https://docs.aws.amazon.com/kms/latest/developerguide/control-access.html) for more details.
3. Create a AWS KMS key, see [here](https://docs.aws.amazon.com/kms/latest/developerguide/create-keys.html) for more details. or, you can use the `/wallet/create` to create a key.

NOTE:

If you are creating the key yourself on AWS KMS Console, then please select the below config to create a key with sign permission.

```
Key Type: Asymmetric
Key Spec: ECC_SECG_P256K1
Key Usage: Sign and verify
```

Once you create the key above, you can use `/wallet/add` and send details on the end-point to create the wallet

### Set up Web3-API with AWS KMS

Create a `.env` file in the root directory of the project and add the below details.

```
# Required for AWS Auth
AWS_ACCESS_KEY_ID=<aws_access_key_id>
AWS_SECRET_ACCESS_KEY=<aws_secret_access_key>
AWS_REGION=<aws_region>

# Required for AWS KMS Admin Wallet
AWS_KMS_KEY_ID=<kms_key_id>
```
