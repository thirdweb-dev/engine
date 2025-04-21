import * as z from "zod";
import {
  gcpAccountConfigSchema,
  gcpAccountCreateParamsSchema,
  gcpAccountCredentialSchema,
  gcpPlatformIdentifiersSchema,
  provisionGcpKmsAccount,
} from "./gcp/gcp.js";
import {
  encryptedJsonToAccount,
  localAccountCreateParamsSchema,
  localPlatformIdentifiersSchema,
  provisionLocalAccount,
} from "./local.js";
import {
  circleAccountConfigSchema,
  circleAccountCreateParamsSchema,
  circleAccountCredentialSchema,
  circlePlatformIdentifiersSchema,
  provisionCircleAccount,
} from "./circle/circle.js";
import {
  awsAccountConfigSchema,
  awsAccountCreateParamsSchema,
  awsAccountCredentialSchema,
  awsPlatformIdentifiersSchema,
  provisionAwsKmsAccount,
} from "./aws/aws.js";

import { config } from "../config.js";
import { err, errAsync, ok, okAsync, ResultAsync, safeTry } from "neverthrow";
import {
  mapDbError,
  type AccountErr,
  type EoaCredentialErr,
  type LocalAccountErr,
  type WalletProviderConfigErr,
} from "../errors.js";
import { db } from "../../db/connection.js";
import { thirdwebClient } from "../thirdweb-client.js";
import { baseAccountResponseSchema } from "./base-schemas.js";
import type { Address } from "thirdweb";
import type { InferSelectModel } from "drizzle-orm";
import type { eoas } from "../../db/schema.js";
import { getAwsKmsAccount } from "./aws/get-aws-account.js";
import { getGcpKmsAccount } from "./gcp/get-gcp-account.js";
import { getCircleAccount } from "./circle/get-circle-account.js";
import type { ENGINE_EOA_TYPES } from "../../db/types.js";
import { getVaultAccount } from "./vault/get-vault-account.js";
import { vaultClient } from "../vault-client.js";

export type EngineEoaType = (typeof ENGINE_EOA_TYPES)[number];

export type EoaPlatformIdentifiers = z.infer<
  typeof accountPlatformIdentifiersSchema
>;

export const accountPlatformIdentifiersSchema = z.discriminatedUnion("type", [
  awsPlatformIdentifiersSchema,
  gcpPlatformIdentifiersSchema,
  circlePlatformIdentifiersSchema,
  localPlatformIdentifiersSchema,
]);

export const accountCreateSchema = z.discriminatedUnion("type", [
  gcpAccountCreateParamsSchema,
  localAccountCreateParamsSchema,
  circleAccountCreateParamsSchema,
  awsAccountCreateParamsSchema,
]);

type CreateAccountParams = z.infer<typeof accountCreateSchema>;

export const accountCredentialSchema = z.discriminatedUnion("type", [
  gcpAccountCredentialSchema,
  awsAccountCredentialSchema,
  circleAccountCredentialSchema,
]);

export type EoaCredential = z.infer<typeof accountCredentialSchema>;

export const accountConfigSchema = z.discriminatedUnion("type", [
  gcpAccountConfigSchema,
  awsAccountConfigSchema,
  circleAccountConfigSchema,
]);

type WalletProviderConfigFlat = z.infer<typeof accountConfigSchema>;

export type WalletProviderConfigMap = {
  [K in WalletProviderConfigFlat["type"]]: Extract<
    WalletProviderConfigFlat,
    { type: K }
  >;
};

export function getWalletProviderConfig<
  T extends WalletProviderConfigFlat["type"],
>(params: { type: T }) {
  const typeConfig = config.walletProviderConfigs[params.type];

  if (!typeConfig) {
    switch (params.type) {
      case "aws-kms": {
        return err({
          kind: "wallet_provider_config",
          code: "missing_aws_kms_config",
        } as WalletProviderConfigErr);
      }
      case "gcp-kms": {
        return err({
          kind: "wallet_provider_config",
          code: "missing_gcp_kms_config",
        } as WalletProviderConfigErr);
      }
      case "circle": {
        return err({
          kind: "wallet_provider_config",
          code: "missing_circle_config",
        } as WalletProviderConfigErr);
      }
    }
  }

  return ok(typeConfig as Extract<WalletProviderConfigFlat, { type: T }>);
}

export function provisionAccount(params: CreateAccountParams) {
  return safeTry(async function* () {
    if (params.type === "local") {
      return ok(yield* provisionLocalAccount(params));
    }

    const credential = yield* ResultAsync.fromPromise(
      db.query.eoaCredentials.findFirst({
        where: (credentials, { eq }) => eq(credentials.id, params.credentialId),
      }),
      mapDbError,
    );

    switch (params.type) {
      case "aws-kms": {
        const awsConfig = yield* getWalletProviderConfig({
          type: "aws-kms",
        });

        if (!credential || credential.data.type !== "aws-kms") {
          return err({
            kind: "eoa_credential",
            code: "credential_not_found",
            message: `Credential not found: ${params.credentialId}`,
            status: 400,
          } as EoaCredentialErr);
        }

        return ok(
          yield* provisionAwsKmsAccount({
            config: awsConfig,
            credentials: credential.data,
            params: params,
            client: thirdwebClient,
          }),
        );
      }
      case "gcp-kms": {
        const gcpConfig = yield* getWalletProviderConfig({
          type: "gcp-kms",
        });

        if (!credential || credential.data.type !== "gcp-kms") {
          return err({
            kind: "eoa_credential",
            code: "credential_not_found",
            message: `Credential not found: ${params.credentialId}`,
            status: 400,
          } as EoaCredentialErr);
        }

        return ok(
          yield* provisionGcpKmsAccount({
            config: gcpConfig,
            credentials: credential.data,
            params: params,
            client: thirdwebClient,
          }),
        );
      }
      case "circle": {
        const circleConfig = yield* getWalletProviderConfig({
          type: "circle",
        });

        if (!credential || credential.data.type !== "circle") {
          return err({
            kind: "eoa_credential",
            code: "credential_not_found",
            message: `Credential not found: ${params.credentialId}`,
            status: 400,
          } as EoaCredentialErr);
        }

        return ok(
          yield* provisionCircleAccount({
            config: circleConfig,
            credentials: credential.data,
            params: params,
            client: thirdwebClient,
          }),
        );
      }
    }
  });
}

export function getSmartAccountDbEntry(params: {
  address: Address;
  signerAddress?: Address;
}) {
  return safeTry(async function* () {
    const smartAccounts = yield* ResultAsync.fromPromise(
      db.query.smartAccounts.findMany({
        where: (sa, { eq, and }) =>
          and(
            eq(sa.address, params.address),
            params.signerAddress
              ? eq(sa.signerAddress, params.signerAddress)
              : undefined,
          ),
        with: {
          signer: {
            with: {
              credential: true,
            },
          },
        },
      }),
      mapDbError,
    );

    if (smartAccounts.length > 1) {
      return errAsync({
        kind: "account",
        code: "could_not_disambiguate",
      } as AccountErr);
    }

    const [smartAccount] = smartAccounts;
    return okAsync(smartAccount);
  });
}

export function getEoaDbEntry(params: { address: Address }) {
  return safeTry(async function* () {
    const eoa = yield* ResultAsync.fromPromise(
      db.query.eoas.findFirst({
        where: (eoa, { eq }) => eq(eoa.address, params.address),
        with: {
          credential: true,
        },
      }),
      mapDbError,
    );

    return okAsync(eoa);
  });
}

type EoaDbEntryWithCredential = InferSelectModel<typeof eoas> & {
  credential: {
    data: EoaCredential | null;
  } | null;
};

export function eoaDbEntryToAccount({
  eoa,
  // encryptionPassword,
}: {
  eoa: EoaDbEntryWithCredential;
  // encryptionPassword?: string;
}) {
  return safeTry(async function* () {
    switch (eoa.type) {
      case "local": {
        const encryptedJson = eoa.encryptedJson;

        if (!encryptedJson) {
          return err({
            kind: "local_account",
            code: "account_decryption_failed",
            message: "Encrypted JSON is missing",
          } as LocalAccountErr);
        }

        return okAsync(
          yield* encryptedJsonToAccount({
            json: encryptedJson,
            // encryptionPassword,
          }),
        );
      }
      case "aws-kms": {
        const credential = eoa.credential?.data;

        if (!credential || credential.type !== "aws-kms") {
          return errAsync({
            kind: "eoa_credential",
            code: "credential_not_found",
            message: `Credential not found or is not an aws-kms credential: ${eoa.address}`,
            status: 400,
          } as EoaCredentialErr);
        }

        const platformIdentifiers = eoa.platformIdentifiers;

        if (!platformIdentifiers || platformIdentifiers.type !== "aws-kms") {
          return errAsync({
            kind: "account",
            code: "invalid_platform_identifiers",
            status: 500,
          } as AccountErr);
        }

        return okAsync(
          yield* getAwsKmsAccount({
            client: thirdwebClient,
            keyId: platformIdentifiers.awsKmsArn,
            credentials: credential,
          }),
        );
      }
      case "gcp-kms": {
        const credential = eoa.credential?.data;

        if (!credential || credential.type !== "gcp-kms") {
          return errAsync({
            kind: "eoa_credential",
            code: "credential_not_found",
            message: `Credential not found or is not a gcp-kms credential: ${eoa.address}`,
            status: 400,
          } as EoaCredentialErr);
        }

        const platformIdentifiers = eoa.platformIdentifiers;

        if (!platformIdentifiers || platformIdentifiers.type !== "gcp-kms") {
          return errAsync({
            kind: "account",
            code: "invalid_platform_identifiers",
            status: 500,
          } as AccountErr);
        }

        return okAsync(
          yield* getGcpKmsAccount({
            client: thirdwebClient,
            respourcePath: platformIdentifiers.gcpKmsResourcePath,
            clientOptions: {
              credentials: {
                client_email: credential.email,
                private_key: credential.privateKey,
              },
            },
          }),
        );
      }
      case "circle": {
        const credential = eoa.credential?.data;

        if (!credential || credential.type !== "circle") {
          return errAsync({
            kind: "eoa_credential",
            code: "credential_not_found",
            message: `Credential not found or is not a circle credential: ${eoa.address}`,
            status: 400,
          } as EoaCredentialErr);
        }

        const platformIdentifiers = eoa.platformIdentifiers;

        if (!platformIdentifiers || platformIdentifiers.type !== "circle") {
          return errAsync({
            kind: "account",
            code: "invalid_platform_identifiers",
            status: 500,
          } as AccountErr);
        }

        const circleConfig = yield* getWalletProviderConfig({
          type: "circle",
        });

        return okAsync(
          yield* getCircleAccount({
            client: thirdwebClient,
            walletId: platformIdentifiers.circleWalletId,
            apiKey: circleConfig.apiKey,
            entitySecret: credential.entitySecret,
          }),
        );
      }
    }
  });
}

export function getEngineAccount(params: {
  address: Address;
  signerAddress?: Address;
  vaultAccessToken?: string;
  // encryptionPassword?: string;
}) {
  return safeTry(async function* () {
    if (params.vaultAccessToken) {
      return okAsync({
        account: getVaultAccount({
          address: params.signerAddress ?? params.address,
          auth: {
            accessToken: params.vaultAccessToken,
          },
          thirdwebClient: thirdwebClient,
          vaultClient: vaultClient,
        }),
      });
    }

    const [smartAccountDetails, eoaDetails] = yield* ResultAsync.combine([
      getSmartAccountDbEntry({
        address: params.address,
        signerAddress: params.signerAddress,
      }),
      getEoaDbEntry({ address: params.address }),
    ]);

    if (eoaDetails) {
      const account = yield* eoaDbEntryToAccount({
        eoa: eoaDetails,
        // encryptionPassword: params.encryptionPassword,
      });

      return okAsync({
        account,
      });
    }
    if (smartAccountDetails) {
      const signerAccount = yield* eoaDbEntryToAccount({
        eoa: smartAccountDetails.signer,
        // encryptionPassword: params.encryptionPassword,
      });

      return okAsync({
        signerAccount: signerAccount,
        smartAccountDetails: smartAccountDetails,
      });
    }

    return errAsync({
      kind: "account",
      code: "account_not_found",
      message: `Account not found: ${params.signerAddress ?? params.address}`,
      status: 400,
    } as AccountErr);
  });
}

export const accountResponseSchema = z.discriminatedUnion("type", [
  gcpPlatformIdentifiersSchema.merge(baseAccountResponseSchema),
  awsPlatformIdentifiersSchema.merge(baseAccountResponseSchema),
  circlePlatformIdentifiersSchema.merge(baseAccountResponseSchema),
  localPlatformIdentifiersSchema.merge(baseAccountResponseSchema),
]);
