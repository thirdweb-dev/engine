import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../../core";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    status: "success",
  },
};

export const updateConfig = async (fastify: FastifyInstance) => {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/config/update",
    schema: {
      description: "Update Engine Config from DB",
      tags: ["Config"],
      operationId: "config_update",
      // hide: true,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, res) => {
      throw createCustomError(
        "Not implemented",
        StatusCodes.NOT_IMPLEMENTED,
        "NOT_IMPLEMENTED",
      );
    },
  });
};
