import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { clearCacheCron } from "../../../../utils/cron/clearCacheCron";
import { isValidCron } from "../../../../utils/cron/isValidCron";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { responseBodySchema } from "./get";

const requestBodySchema = Type.Object({
  clearCacheCronSchedule: Type.String({
    description:
      "Cron expression for clearing cache. It should be in the format of 'ss mm hh * * *' where ss is seconds, mm is minutes and hh is hours. Seconds should not be '*' or less than 10",
    default: "*/30 * * * * *",
  }),
});

export async function updateCacheConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/configuration/cache",
    schema: {
      summary: "Update cache configuration",
      description: "Update cache configuration",
      tags: ["Configuration"],
      operationId: "updateCacheConfiguration",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { clearCacheCronSchedule } = req.body;
      if (isValidCron(clearCacheCronSchedule) === false) {
        throw createCustomError(
          "Invalid cron expression.",
          StatusCodes.BAD_REQUEST,
          "INVALID_CRON",
        );
      }

      await updateConfiguration({ ...req.body });
      const config = await getConfig(false);
      // restarting cache cron with updated cron schedule
      await clearCacheCron("server");
      res.status(StatusCodes.OK).send({
        result: {
          clearCacheCronSchedule: config.clearCacheCronSchedule,
        },
      });
    },
  });
}
