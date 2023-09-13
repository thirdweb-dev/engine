import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../../core";
import { queueTx } from "../../../src/db/transactions/queueTx";
import {
  publishedDeployParamSchema,
  standardResponseSchema,
} from "../../helpers/sharedApiSchemas";
import { web3APIOverridesForWriteRequest } from "../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../utilities/chain";

// INPUTS
const requestSchema = publishedDeployParamSchema;
const requestBodySchema = Type.Object({
  constructorParams: Type.Array(Type.Any(), {
    description: "Constructor arguments for the deployment.",
  }),
  version: Type.Optional(
    Type.String({
      description: "Version of the contract to deploy. Defaults to latest.",
    }),
  ),
  ...web3APIOverridesForWriteRequest.properties,
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    constructorParams: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
    web3api_overrides: {
      from: "0x...",
    },
  },
];

// OUTPUT
const responseSchema = Type.Object({
  queuedId: Type.Optional(Type.String()),
  deployedAddress: Type.Optional(Type.String()),
});

export async function deployPublished(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/deployer/:network/:publisher/:contract_name",
    schema: {
      description: "Deploy published contract",
      tags: ["Deploy"],
      operationId: "deployPublished",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, publisher, contract_name } = request.params;
      const { constructorParams, version, web3api_overrides } = request.body;
      const chainId = getChainIdFromChain(network);

      const sdk = await getSDK(network, web3api_overrides?.from);
      const tx = await sdk.deployer.deployReleasedContract.prepare(
        publisher,
        contract_name,
        constructorParams,
        version,
      );
      const deployedAddress = await tx.simulate();

      const queuedId = await queueTx({
        tx,
        chainId,
        extension: "deploy-published",
        deployedContractAddress: deployedAddress,
        deployedContractType: contract_name,
      });
      reply.status(StatusCodes.OK).send({
        deployedAddress,
        queuedId,
      });
    },
  });
}
