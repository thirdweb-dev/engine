import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { isValidCron } from "../../../../utils/cron/isValid";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { ReplySchema } from "./get";

const BodySchema = Type.Object({
  clearCacheCronSchedule: Type.String(),
});

export async function updateCacheConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/configuration/cache",
    schema: {
      summary: "Update cache configuration",
      description: "Update the engine configuration for cache",
      tags: ["Configuration"],
      operationId: "updateCacheConfiguration",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { clearCacheCronSchedule } = req.body;

      if (isValidCron(clearCacheCronSchedule) === false) {
        return res.status(400).send({
          error: {
            code: 400,
            message: "Invalid cron expression",
          },
        });
      }

      await updateConfiguration({ ...req.body });
      const config = await getConfig(false);
      res.status(200).send({
        result: {
          clearCacheCronSchedule: config.clearCacheCronSchedule,
        },
      });
    },
  });
}
