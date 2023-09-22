import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { EngineConfigSchema } from "../../schemas/config";
import { addAwsConfig } from "../../utils/config/addAwsConfig";
import { addGoogleConfig } from "../../utils/config/addGoogleConfig";
import { addLocalConfig } from "../../utils/config/addLocalConfig";

// INPUT
const RequestBodySchema = EngineConfigSchema;

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

export const createConfig = async (fastify: FastifyInstance) => {
  fastify.route<{
    Body: Static<typeof RequestBodySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "POST",
    url: "/config/create",
    schema: {
      description: "Create Engine Config",
      tags: ["Config"],
      operationId: "config_create",
      body: RequestBodySchema,
      // hide: true,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, res) => {
      const { aws, gcp, local } = req.body;
      req.log.info({ aws, gcp, local }, "create config");

      if (aws) {
        await addAwsConfig(aws);
      } else if (gcp) {
        await addGoogleConfig(gcp);
      } else if (local) {
        await addLocalConfig(local);
      }
      res.status(StatusCodes.OK).send({
        result: {
          status: "success",
        },
      });
    },
  });
};
