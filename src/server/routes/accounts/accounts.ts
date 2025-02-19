import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { resolver, validator as zValidator } from "hono-openapi/zod";
import { eoas, smartAccounts } from "../../../db/schema";
import { err, ok, ResultAsync, safeTry } from "neverthrow";
import { db } from "../../../db/connection";
import {
  engineErrToHttpException,
  mapDbError,
  type DbErr,
} from "../../../lib/errors";
import type { Address } from "thirdweb";
import { getSmartAccount } from "../../../lib/accounts/smart";
import {
  DEFAULT_ACCOUNT_FACTORY_V0_7,
  ENTRYPOINT_ADDRESS_v0_7,
} from "thirdweb/wallets/smart";
import {
  accountCreateSchema,
  accountResponseSchema,
  provisionAccount,
} from "../../../lib/accounts/accounts";

export const accountsRoutes = new Hono();

accountsRoutes.post(
  "/",
  describeRoute({
    description: "Create a new engine managed account",
    tags: ["Accounts"],
    responses: {
      201: {
        description: "Account created successfully with default smart account",
        content: {
          "application/json": {
            schema: resolver(accountResponseSchema),
          },
        },
      },
    },
  }),
  zValidator("json", accountCreateSchema),
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
