Thirdweb Engine supports Google KMS for signing & sending transactions over any EVM chain. This is a guide on how to set up Google KMS for.

### Steps to set up Google KMS

1. Enable Google KMS API for your Google project, see [here](https://cloud.google.com/kms/docs/create-encryption-keys#before-you-begin) for more details.
2. Create a Service Account (here)[https://cloud.google.com/iam/docs/service-accounts-create]
3. Go to IAM & Admin -> IAM. Select the service account created in step 2 and click `Edit Principal` to add the below roles.

```
Minimum Roles:

Cloud KMS Admin
Cloud KMS CryptoKey Signer/Verifier
```

4. Click on the created Service-Account and go to `Keys` tab.
5. Click `Add Key` -> Create new Key -> select `JSON` & download the JSON file. This JSON file details will be used to authenticate google auth while using Google Cloud KMS.
6. Create a keyring in Google KMS, see [here](https://cloud.google.com/kms/docs/create-key-ring) for more details.

Optional: Create a key in the keyring, see [here](https://cloud.google.com/kms/docs/create-key) for more details. or, you can use the `/backend-wallet/create` to create a key in the keyring.

### Set up with Google KMS

If you are on the `latest` or `nightly` version of Web3-API, then you can use the below steps to set up AWS KMS:

1. Make sure your Engine is running with the environment variables setup, see [here](../1-user-guide.md) for more details.
2. Open [thirdweb Engine Dashboard](https://thirdweb.com/dashboard/engine) and add your local Engine URL `https://localhost:3005`
3. Open `Configurations Tab` and use the details from the JSON file downloaded to setup GCP KMS.

```js
{
  "gcpApplicationProjectId": "<your-gcp-application-project-id>",
  "gcpKmsLocationId": "<your-gcp-kms-location-id>",
  "gcpKmsKeyRingId": "<your-gcp-key-ring-id>",
  "gcpApplicationCredentialEmail": "<your-gcp-application-credential-email>",
  "gcpApplicationCredentialPrivateKey": "<your-gcp-application-credential-private-key>"
}
```

4. Click `create` & the GCP KMS Config will be added to Engine.

Now you can Create or Import GCP KMS Wallets using the `/backend-wallet/create` or `/backend-wallet/import` endpoints.

#### For Engine Version below `v0.0.3`, use the below:

Create a `.env` file in the root directory of the project and add the below details.

```
# Required for Google Auth
GOOGLE_APPLICATION_CREDENTIAL_EMAIL=<client_email_from_download_service_account_json>
GOOGLE_APPLICATION_CREDENTIAL_PRIVATE_KEY=<private_key_from_download_service_account_json>

# Required for Google Cloud KMS
GOOGLE_APPLICATION_PROJECT_ID=<google_project_id>
GOOGLE_KMS_KEY_RING_ID=<key_ring_id>
GOOGLE_KMS_LOCATION_ID=<location_of_key_ring>
```
