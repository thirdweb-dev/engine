import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../../../core";
import { standardResponseSchema } from "../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";
import { queueTransaction } from "../../../helpers";
import {
  commonContractSchema,
  commonRoyaltySchema,
  commonSymbolSchema,
  commonPlatformFeeSchema,
  commonPrimarySaleSchema,
  commonTrustedForwarderSchema,
  prebuiltDeployContractParamSchema,
  prebuiltDeployResponseSchema,
} from "../../../schemas/prebuilts/index";

// INPUTS
const requestSchema = prebuiltDeployContractParamSchema;
const requestBodySchema = Type.Object({
  contractMetadata: Type.Object({
    ...commonContractSchema.properties,
    ...commonRoyaltySchema.properties,
    ...commonSymbolSchema.properties,
    ...commonPlatformFeeSchema.properties,
    ...commonPrimarySaleSchema.properties,
    ...commonTrustedForwarderSchema.properties,
  }),
  version: Type.Optional(
    Type.String({
      description: "Version of the contract to deploy. Defaults to latest.",
    }),
  ),
});

// Example for the Request Body

// OUTPUT
const responseSchema = prebuiltDeployResponseSchema;

export async function deployPrebuiltEdition(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/deployer/:network/prebuilts/edition",
    schema: {
      description: "Deploy prebuilt Edition contract",
      tags: ["Deploy"],
      operationId: "deployPrebuiltEdition",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network } = request.params;
      const { contractMetadata, version } = request.body;
      const sdk = await getSDK(network);

      const tx = await sdk.deployer.deployBuiltInContract.prepare(
        "edition",
        contractMetadata,
        version,
      );
      const deployedAddress = await tx.simulate();
      const queuedId = await queueTransaction(
        request,
        tx,
        network,
        "deployer_prebuilt",
        deployedAddress,
        "edition",
      );
      reply.status(StatusCodes.OK).send({
        result: {
          deployedAddress,
          queuedId,
        },
      });
    },
  });
}
