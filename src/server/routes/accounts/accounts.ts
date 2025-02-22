import { and, count, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { err, ok, ResultAsync, safeTry } from "neverthrow";
import type { Address } from "thirdweb";
import {
  DEFAULT_ACCOUNT_FACTORY_V0_7,
  ENTRYPOINT_ADDRESS_v0_7,
} from "thirdweb/wallets/smart";
import * as z from "zod";
import { db } from "../../../db/connection";
import { eoas, smartAccounts } from "../../../db/schema";
import {
  accountCreateSchema,
  accountResponseSchema,
  provisionAccount,
} from "../../../lib/accounts/accounts";
import { getSmartAccount } from "../../../lib/accounts/smart";
import {
  engineErrToHttpException,
  mapDbError,
  zErrorMapper,
  type AccountErr,
  type DbErr,
} from "../../../lib/errors";
import { evmAddressSchema } from "../../../lib/zod";
import {
  requestPaginationSchema,
  wrapPaginatedResponseSchema,
  wrapResponseSchema,
} from "../../schemas/shared-api-schemas";
import { getDisplayAddress } from "../../../lib/evm";

export const accountsRoutes = new Hono();

accountsRoutes.post(
  "/",
  zValidator("json", accountCreateSchema, zErrorMapper),
  describeRoute({
    summary: "Create Account",
    description:
      "Create a new engine managed account. Also automatically provisions a default smart account to use with the new account.",
    operationId: "createAccount",
    tags: ["Accounts"],
    responses: {
      201: {
        description: "Account created successfully with default smart account",
        content: {
          "application/json": {
            schema: resolver(wrapResponseSchema(accountResponseSchema)),
          },
        },
      },
    },
  }),
  async (c) => {
    const params = c.req.valid("json");
    const resultChain = safeTry(async function* () {
      const provisionedResponse = yield* provisionAccount(params);
      const provisionedAccount = provisionedResponse.account;

      const [dbEoaEntry] = yield* ResultAsync.fromPromise(
        db
          .insert(eoas)
          .values({
            address: provisionedResponse.account.address as Address,
            type: params.type,
            encryptedJson:
              "encryptedJson" in provisionedResponse
                ? provisionedResponse.encryptedJson
                : undefined,
            platformIdentifiers:
              "platformIdentifiers" in provisionedResponse
                ? provisionedResponse.platformIdentifiers
                : undefined,
            label: params.label,
          })
          .returning(),
        mapDbError,
      );

      if (!dbEoaEntry) {
        return err({
          kind: "database",
          code: "query_failed",
        } as DbErr);
      }

      const smartAccount = yield* getSmartAccount({
        adminAccount: provisionedAccount,
        accountFactoryAddress: DEFAULT_ACCOUNT_FACTORY_V0_7,
        entrypointAddress: ENTRYPOINT_ADDRESS_v0_7,
      });

      const [dbSmartAccountEntry] = yield* ResultAsync.fromPromise(
        db
          .insert(smartAccounts)
          .values({
            address: smartAccount.address as Address,
            signerAddress: provisionedAccount.address as Address,
            label: `Default Smart Account for ${getDisplayAddress(
              provisionedAccount.address,
            )}`,
            factoryAddress: DEFAULT_ACCOUNT_FACTORY_V0_7,
            entrypointAddress: ENTRYPOINT_ADDRESS_v0_7,
            accountSalt: null,
          })
          .returning(),
        mapDbError,
      );

      if (!dbEoaEntry) {
        return err({
          kind: "database",
          code: "query_failed",
          message: "Unable to insert newly created smart account",
        } as DbErr);
      }

      return ok({
        ...dbEoaEntry,
        encryptedJson: undefined,
        smartAccounts: [dbSmartAccountEntry],
      });
    });

    const result = await resultChain;

    if (result.isOk()) {
      return c.json({
        result: result.value,
      });
    }
    throw engineErrToHttpException(result.error);
  },
);

accountsRoutes.get(
  "/",
  describeRoute({
    summary: "Get All Accounts",
    description:
      "Get all your engine managed accounts with their smart accounts",
    tags: ["Accounts"],
    operationId: "getAllAccounts",
    responses: {
      200: {
        description: "Accounts",
        content: {
          "application/json": {
            schema: resolver(
              wrapPaginatedResponseSchema(accountResponseSchema),
            ),
          },
        },
      },
    },
  }),
  zValidator("query", requestPaginationSchema, zErrorMapper),
  async (c) => {
    const params = c.req.valid("query");
    const skip = (params.page - 1) * params.limit;

    const combined = await ResultAsync.combine([
      ResultAsync.fromPromise(
        db.query.eoas.findMany({
          offset: skip,
          limit: params.limit,
          where: (eoas, { isNull }) => isNull(eoas.deletedAt),
          columns: {
            encryptedJson: false,
          },
          with: {
            smartAccounts: {
              where: (smartAccounts, { isNull }) =>
                isNull(smartAccounts.deletedAt),
            },
          },
        }),
        mapDbError,
      ),
      ResultAsync.fromPromise(
        db.select({ count: count() }).from(eoas).where(isNull(eoas.deletedAt)),
        mapDbError,
      ),
    ]);

    if (combined.isErr()) {
      throw engineErrToHttpException(combined.error);
    }

    const [data, countObject] = combined.value;

    const totalCount = countObject[0]?.count;

    if (!totalCount)
      throw engineErrToHttpException({
        code: "query_failed",
        kind: "database",
        status: 500,
        message: "Count query returned no response for eoas",
      });

    return c.json({
      result: {
        result: data,
        pagination: {
          totalCount,
          page: params.page,
          limit: params.limit,
        },
      },
    });
  },
);

accountsRoutes.delete(
  "/:address",
  describeRoute({
    summary: "Delete Account",
    description:
      "Delete an account by address. Deleting an EOA account will also delete any associated smart accounts. Deleting a smart account will only delete the smart account.",
    tags: ["Accounts"],
    operationId: "deleteAccount",
    responses: {
      200: {
        description: "Account deleted",
        content: {
          "application/json": {
            schema: resolver(
              z.union([
                wrapResponseSchema(z.literal("EOA Account deleted")),
                wrapResponseSchema(z.literal("Smart Account deleted")),
              ]),
            ),
          },
        },
      },
    },
  }),
  zValidator("param", z.object({ address: evmAddressSchema }), zErrorMapper),
  async (c) => {
    const { address } = c.req.valid("param");

    const resultChain = safeTry(async function* () {
      // First check if address is an EOA
      const eoaResult = yield* ResultAsync.fromPromise(
        db.query.eoas.findFirst({
          where: (eoas, { eq, isNull }) =>
            and(eq(eoas.address, address), isNull(eoas.deletedAt)),
        }),
        mapDbError,
      );

      if (eoaResult) {
        // Delete EOA and all associated smart accounts
        // Update EOA
        yield* ResultAsync.fromPromise(
          db
            .update(eoas)
            .set({
              deletedAt: new Date(),
            })
            .where(eq(eoas.address, address)),
          mapDbError,
        );

        // Update all associated smart accounts
        yield* ResultAsync.fromPromise(
          db
            .update(smartAccounts)
            .set({
              deletedAt: new Date(),
            })
            .where(eq(smartAccounts.signerAddress, address)),
          mapDbError,
        );

        return ok("EOA Account deleted");
      }

      // // If not EOA, check if it's a smart account
      const smartAccountResult = yield* ResultAsync.fromPromise(
        db.query.smartAccounts.findFirst({
          where: (smartAccounts, { eq, isNull }) =>
            and(
              eq(smartAccounts.address, address),
              isNull(smartAccounts.deletedAt),
            ),
        }),
        mapDbError,
      );

      if (smartAccountResult) {
        // Delete just this smart account
        yield* ResultAsync.fromPromise(
          db
            .update(smartAccounts)
            .set({
              deletedAt: new Date(),
            })
            .where(eq(smartAccounts.address, address)),
          mapDbError,
        );

        return ok("Smart Account deleted");
      }

      return err({
        kind: "account",
        code: "account_not_found",
        message: "Account not found",
        status: 400,
      } as AccountErr);
    });

    const result = await resultChain;

    if (result.isOk()) {
      return c.json({
        result: result.value,
      });
    }

    throw engineErrToHttpException(result.error);
  },
);
