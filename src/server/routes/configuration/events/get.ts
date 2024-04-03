import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

export const ReplySchema = Type.Object({
  result: Type.Object({
    maxBlocksToIndex: Type.Number(),
  }),
});

export async function getEventsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/configuration/events",
    schema: {
      summary: "Get events configuration",
      description: "Get the engine configuration for events",
      tags: ["Configuration"],
      operationId: "getEventsConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig();
      res.status(200).send({
        result: {
          maxBlocksToIndex: config.maxBlocksToIndex,
        },
      });
    },
  });
}
