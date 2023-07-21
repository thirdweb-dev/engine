export const WEB3_API_REQUIRED_ENV_VARS = [
  "POSTGRES_HOST",
  "POSTGRES_DATABASE_NAME",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_PORT",
  "POSTGRES_USE_SSL",
];

export const WEB3_API_WALLETS_ENV_VARS = [
  { walletPPK: ["WALLET_PRIVATE_KEY"] },
  {
    awsKmsWallet: [
      "AWS_REGION",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_KMS_KEY_ID",
    ],
  },
] as { [key: string]: string[] }[];

export const WEB3_API_SERVER_ENV_VARS = WEB3_API_REQUIRED_ENV_VARS.concat([
  "OPENAPI_BASE_ORIGIN",
]);

export const THIRDWEB_SDK_REQUIRED_ENV_VARS = ["THIRDWEB_SDK_SECRET_KEY"];
