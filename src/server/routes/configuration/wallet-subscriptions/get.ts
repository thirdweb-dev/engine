import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

const responseBodySchema = Type.Object({
  result: Type.Object({
    walletSubscriptionsCronSchedule: Type.String(),
  }),
});

export async function getWalletSubscriptionsConfiguration(
  fastify: FastifyInstance,
) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/configuration/wallet-subscriptions",
    schema: {
      summary: "Get wallet subscriptions configuration",
      description:
        "Get wallet subscriptions configuration including cron schedule",
      tags: ["Configuration"],
      operationId: "getWalletSubscriptionsConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (_req, res) => {
      const config = await getConfig(false);
      res.status(StatusCodes.OK).send({
        result: {
          walletSubscriptionsCronSchedule:
            config.walletSubscriptionsCronSchedule || "*/30 * * * * *",
        },
      });
    },
  });
}
