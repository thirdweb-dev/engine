import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../../core";
import {
  baseReplyErrorSchema,
  prebuiltDeployParamSchema,
  standardResponseSchema,
} from "../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";
import { queueTransaction } from "../../helpers";

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
    url: "/deployer/:chain_name_or_id/:contract_type",
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
      const { chain_name_or_id, contract_type } = request.params;
      const { contractMetadata, version } = request.body;
      const sdk = await getSDK(chain_name_or_id);
      const tx = await sdk.deployer.deployBuiltInContract.prepare(
        contract_type,
        contractMetadata,
        version,
      );
      const deployedAddress = await tx.simulate();
      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "deployer_prebuilt",
      );
      reply.status(StatusCodes.OK).send({
        deployedAddress,
        queuedId,
      });
    },
  });
}
