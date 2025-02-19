import * as z from "zod";
import {
  gcpAccountConfigSchema,
  gcpAccountCreateParamsSchema,
  gcpAccountCredentialSchema,
  gcpPlatformIdentifiersSchema,
  provisionGcpKmsAccount,
} from "./gcp/gcp";
import {
  localAccountCreateParamsSchema,
  localPlatformIdentifiersSchema,
  provisionLocalAccount,
} from "./local";
import {
  circleAccountConfigSchema,
  circleAccountCreateParamsSchema,
  circleAccountCredentialSchema,
  circlePlatformIdentifiersSchema,
  provisionCircleAccount,
} from "./circle/circle";
import {
  awsAccountConfigSchema,
  awsAccountCreateParamsSchema,
  awsAccountCredentialSchema,
  awsPlatformIdentifiersSchema,
  provisionAwsKmsAccount,
} from "./aws/aws";

import { config } from "../config";
import { err, ok, ResultAsync, safeTry } from "neverthrow";
import {
  mapDbError,
  type EoaCredentialErr,
  type WalletProviderConfigErr,
} from "../errors";
import { db } from "../../db/connection";
import { thirdwebClient } from "../thirdweb-client";
import { baseAccountResponseSchema } from "./base-schemas";

export const ENGINE_EOA_TYPES = [
  "local",
  "aws-kms",
  "gcp-kms",
  "circle",
] as const;

export type EngineEoaType = (typeof ENGINE_EOA_TYPES)[number];

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
        const awsConfig = config.walletProviderConfigs["aws-kms"];
        if (!awsConfig) {
          return err({
            kind: "wallet_provider_config",
            code: "missing_aws_kms_config",
          } as WalletProviderConfigErr);
        }
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
        const gcpConfig = config.walletProviderConfigs["gcp-kms"];
        if (!gcpConfig) {
          return err({
            kind: "wallet_provider_config",
            code: "missing_gcp_kms_config",
          } as WalletProviderConfigErr);
        }
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
        const circleConfig = config.walletProviderConfigs.circle;
        if (!circleConfig) {
          return err({
            kind: "wallet_provider_config",
            code: "missing_circle_config",
          } as WalletProviderConfigErr);
        }
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

export const accountResponseSchema = z.discriminatedUnion("type", [
  gcpPlatformIdentifiersSchema.merge(baseAccountResponseSchema),
  awsPlatformIdentifiersSchema.merge(baseAccountResponseSchema),
  circlePlatformIdentifiersSchema.merge(baseAccountResponseSchema),
  localPlatformIdentifiersSchema.merge(baseAccountResponseSchema),
]);
