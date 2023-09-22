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

export const deleteConfig = async (fastify: FastifyInstance) => {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/config/delete",
    schema: {
      description: "Delete Engine Config from DB",
      tags: ["Config"],
      operationId: "config_delete",
      hide: true,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, res) => {
      // ToDo: Implement
      throw createCustomError(
        "Not implemented",
        StatusCodes.NOT_IMPLEMENTED,
        "NOT_IMPLEMENTED",
      );
    },
  });
};
