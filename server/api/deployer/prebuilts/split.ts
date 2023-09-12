import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../../../core";
import { queueTransaction } from "../../../helpers";
import { standardResponseSchema } from "../../../helpers/sharedApiSchemas";
import {
  commonContractSchema,
  commonTrustedForwarderSchema,
  prebuiltDeployContractParamSchema,
  prebuiltDeployResponseSchema,
  splitRecipientInputSchema,
} from "../../../schemas/prebuilts";
import { web3APIOverridesForWriteRequest } from "../../../schemas/web3api-overrides";

// INPUTS
const requestSchema = prebuiltDeployContractParamSchema;
const requestBodySchema = Type.Object({
  contractMetadata: Type.Object({
    ...commonContractSchema.properties,
    recipients: Type.Array(splitRecipientInputSchema),
    ...commonTrustedForwarderSchema.properties,
  }),
  version: Type.Optional(
    Type.String({
      description: "Version of the contract to deploy. Defaults to latest.",
    }),
  ),
  ...web3APIOverridesForWriteRequest.properties,
});

// Example for the Request Body

// OUTPUT
const responseSchema = prebuiltDeployResponseSchema;

export async function deployPrebuiltSplit(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/deployer/:network/prebuilts/split",
    schema: {
      description: "Deploy prebuilt Split contract",
      tags: ["Deploy"],
      operationId: "deployPrebuiltSplit",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      //TODO add x-wallet-address to headers
      const { network } = request.params;
      const { contractMetadata, version, web3api_overrides } = request.body;
      const sdk = await getSDK(network, web3api_overrides?.from);
      const tx = await sdk.deployer.deployBuiltInContract.prepare(
        "split",
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
        "split",
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
