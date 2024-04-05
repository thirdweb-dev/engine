import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { clearConfigCache, getConfig } from "../../../../utils/cache/getConfig";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { ReplySchema } from "./get";

const BodySchema = Type.Object({
  maxBlocksToIndex: Type.Number(),
});

export async function updateEventsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/configuration/events",
    schema: {
      summary: "Update events configuration",
      description: "Update the engine configuration for events",
      tags: ["Configuration"],
      operationId: "updateEventsConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { maxBlocksToIndex } = req.body;

      if (maxBlocksToIndex < 1 || maxBlocksToIndex > 10) {
        throw createCustomError(
          "Required: 0 < maxBlocksToIndex <= 10",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      await updateConfiguration({ maxBlocksToIndex });

      await clearConfigCache();
      const config = await getConfig();
      res.status(200).send({
        result: {
          maxBlocksToIndex: config.maxBlocksToIndex,
        },
      });
    },
  });
}
