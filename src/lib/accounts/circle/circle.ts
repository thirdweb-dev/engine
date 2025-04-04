import * as z from "zod";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { err, ok, ResultAsync, safeTry } from "neverthrow";
import type { Account } from "thirdweb/wallets";
import type { ThirdwebClient } from "thirdweb";
import type { CircleErr } from "../../errors.js";
import { getCircleAccount } from "./get-circle-account.js";
import {
  baseAccountCreateSchema,
  baseCredentialIdSchema,
} from "../base-schemas.js";

const type = z.literal("circle");

export const circlePlatformIdentifiersSchema = z.object({
  circleWalletId: z.string().openapi({
    description: "The ID of the Circle wallet",
    example: "12345678-1234-1234-1234-123456789012",
  }),
  walletSetId: z.string().openapi({
    description: "The ID of the wallet set",
    example: "12345678-1234-1234-1234-123456789012",
  }),
  isTestnet: z.boolean().openapi({
    description: "Whether the Circle wallet is on testnet",
    example: true,
  }),
  type,
});

export const circleAccountCreateParamsSchema = z
  .object({
    type,
    walletSetId: z.string().optional().openapi({
      description: "The ID of the wallet set",
      example: "12345678-1234-1234-1234-123456789012",
    }),
    isTestnet: z.boolean().openapi({
      description: "Whether the Circle wallet is on testnet",
      example: true,
    }),
  })
  .merge(baseCredentialIdSchema)
  .merge(baseAccountCreateSchema);

export const circleAccountCredentialSchema = z.object({
  entitySecret: z.string().openapi({
    description:
      "32-byte hex string. Consult https://developers.circle.com/w3s/entity-secret-management to create and register an entity secret.",
    example: "152e208d08cd3ea1aa5d179b2e3eba7d1a733ef4",
  }),
  type,
});

export const circleAccountConfigSchema = z.object({
  apiKey: z.string().openapi({
    description: "The API key for the Circle API",
  }),
  type,
});

type AxiosApiError = {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
};

export const isAxiosApiError = (error: unknown): error is AxiosApiError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null
  );
};

export const mapCircleError = (
  error: unknown,
  code: CircleErr["code"],
  defaultMessage: string,
): CircleErr => {
  if (isAxiosApiError(error)) {
    const statusCode = error.response?.status ?? 500;
    const responseMessage = error.response?.data?.message;

    // Map HTTP status codes to appropriate error codes
    const mappedCode: CircleErr["code"] =
      statusCode === 429
        ? "rate_limit_exceeded"
        : statusCode === 401
        ? "unauthorized"
        : statusCode === 503
        ? "service_unavailable"
        : code;

    return {
      kind: "circle",
      code: mappedCode,
      status: statusCode,
      message: responseMessage ?? defaultMessage,
      source: error,
    } as CircleErr;
  }

  return {
    kind: "circle",
    code,
    status: 500,
    message: error instanceof Error ? error.message : defaultMessage,
    source: error instanceof Error ? error : undefined,
  };
};

export function provisionCircleAccount({
  params,
  config,
  credentials,
  client,
}: {
  params: z.infer<typeof circleAccountCreateParamsSchema>;
  config: z.infer<typeof circleAccountConfigSchema>;
  credentials: z.infer<typeof circleAccountCredentialSchema>;
  client: ThirdwebClient;
}): ResultAsync<
  {
    account: Account;
    platformIdentifiers: z.infer<typeof circlePlatformIdentifiersSchema>;
  },
  CircleErr
> {
  const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
    apiKey: config.apiKey,
    entitySecret: credentials.entitySecret,
  });

  return safeTry(async function* () {
    // Get or create wallet set
    let walletSetId = params.walletSetId;

    if (!walletSetId) {
      const walletSetResponse = yield* ResultAsync.fromPromise(
        circleDeveloperSdk.createWalletSet({
          name: `Engine WalletSet ${new Date().toISOString()}`,
        }),
        (error) =>
          mapCircleError(
            error,
            "wallet_set_creation_failed",
            "Could not create wallet set",
          ),
      );

      walletSetId = walletSetResponse.data?.walletSet.id;
      if (!walletSetId) {
        return err({
          kind: "circle",
          code: "wallet_set_creation_failed",
          message: "Did not receive wallet set ID from Circle API",
          status: 500,
        } as CircleErr);
      }
    }

    // Provision new wallet
    const walletResponse = yield* ResultAsync.fromPromise(
      circleDeveloperSdk.createWallets({
        accountType: "EOA",
        blockchains: [params.isTestnet ? "EVM-TESTNET" : "EVM"],
        count: 1,
        walletSetId: walletSetId,
      }),
      (error) =>
        mapCircleError(
          error,
          "wallet_provisioning_failed",
          "Could not provision wallet",
        ),
    );

    const provisionedWallet = walletResponse.data?.wallets?.[0];
    if (!provisionedWallet) {
      return err({
        kind: "circle",
        code: "wallet_provisioning_failed",
        message: "Did not receive provisioned wallet from Circle API",
        status: 500,
      } as CircleErr);
    }

    // Get Circle account
    const account = yield* getCircleAccount({
      walletId: provisionedWallet.id,
      apiKey: config.apiKey,
      entitySecret: credentials.entitySecret,
      client,
    });

    return ok({
      account,
      platformIdentifiers: {
        type: "circle" as const,
        circleWalletId: provisionedWallet.id,
        walletSetId: walletSetId,
        isTestnet: !!params.isTestnet,
      },
    });
  });
}

export type CircleAccount = Account;
