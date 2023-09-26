import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../../core";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { WalletConfigSchema } from "../../schemas/config";
import { addAwsConfig } from "../../utils/config/addAwsConfig";
import { addGoogleConfig } from "../../utils/config/addGoogleConfig";

// INPUT
const RequestBodySchema = WalletConfigSchema;

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
      hide: true,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, res) => {
      const { aws, gcp, local } = req.body as any;
      // Cannot use WALLET_CONFIGURATION as now it can be on DB
      if (aws && Object.keys(aws).length > 0) {
        await addAwsConfig(aws);
      } else if (gcp && Object.keys(gcp).length > 0) {
        await addGoogleConfig(gcp);
      } else {
        throw createCustomError(
          "No data provided for AWS or GCP Config Storage",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }
      res.status(StatusCodes.OK).send({
        result: {
          status: "success",
        },
      });
    },
  });
};
