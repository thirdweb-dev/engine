import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../../core";
import { queueTransaction } from "../../helpers";
import {
  prebuiltDeployParamSchema,
  standardResponseSchema,
} from "../../helpers/sharedApiSchemas";
import { web3APIOverridesForWriteRequest } from "../../schemas/web3api-overrides";

// INPUTS
const requestSchema = prebuiltDeployParamSchema;
const requestBodySchema = Type.Object({
  // TODO need to type this
  contractMetadata: Type.Any({
    description: "Arguments for the deployment.",
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
    contractMetadata: {
      name: `My Contract`,
      description: "Contract deployed from web3 api",
      primary_sale_recipient: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      seller_fee_basis_points: 500,
      fee_recipient: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      platform_fee_basis_points: 10,
      platform_fee_recipient: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
    },
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

export async function deployPrebuilt(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/deployer/:network/:contract_type",
    schema: {
      description: "Deploy prebuilt contract",
      tags: ["Deploy"],
      operationId: "deployPrebuilt",
      params: requestSchema,
      body: requestBodySchema,
      hide: true,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_type } = request.params;
      const { contractMetadata, version, web3api_overrides } = request.body;
      const sdk = await getSDK(network, {
        walletAddress: web3api_overrides?.from,
      });
      const tx = await sdk.deployer.deployBuiltInContract.prepare(
        contract_type,
        contractMetadata,
        version,
      );
      const deployedAddress = await tx.simulate();
      const queuedId = await queueTransaction(
        request,
        tx,
        network,
        "deployer_prebuilt",
      );
      reply.status(StatusCodes.OK).send({
        deployedAddress,
        queuedId,
      });
    },
  });
}
