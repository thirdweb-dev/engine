import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../shared/db/configuration/update-configuration";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { isValidCron } from "../../../../shared/utils/cron/is-valid-cron";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

const requestBodySchema = Type.Object({
  walletSubscriptionsCronSchedule: Type.String({
    description:
      "Cron expression for wallet subscription checks. It should be in the format of 'ss mm hh * * *' where ss is seconds, mm is minutes and hh is hours. Seconds should not be '*' or less than 10",
    default: "*/30 * * * * *",
  }),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    walletSubscriptionsCronSchedule: Type.String(),
  }),
});

export async function updateWalletSubscriptionsConfiguration(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/configuration/wallet-subscriptions",
    schema: {
      summary: "Update wallet subscriptions configuration",
      description:
        "Update wallet subscriptions configuration including cron schedule",
      tags: ["Configuration"],
      operationId: "updateWalletSubscriptionsConfiguration",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { walletSubscriptionsCronSchedule } = req.body;
      if (isValidCron(walletSubscriptionsCronSchedule) === false) {
        throw createCustomError(
          "Invalid cron expression.",
          StatusCodes.BAD_REQUEST,
          "INVALID_CRON",
        );
      }

      await updateConfiguration({ walletSubscriptionsCronSchedule });
      const config = await getConfig(false);
      res.status(StatusCodes.OK).send({
        result: {
          walletSubscriptionsCronSchedule:
            config.walletSubscriptionsCronSchedule,
        },
      });
    },
  });
}
