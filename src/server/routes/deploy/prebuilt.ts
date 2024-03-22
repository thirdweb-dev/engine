import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../db/transactions/queueTx";
import { getSdk } from "../../../utils/cache/getSdk";
import {
  prebuiltDeployParamSchema,
  standardResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { txOverrides } from "../../schemas/txOverrides";
import { walletHeaderSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

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
  ...txOverrides.properties,
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    contractMetadata: {
      name: `My Contract`,
      description: "Contract deployed from thirdweb Engine",
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
  queueId: Type.Optional(Type.String()),
  deployedAddress: Type.Optional(Type.String()),
});

export async function deployPrebuilt(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/deploy/:chain/:contractType",
    schema: {
      description: "Deploy prebuilt contract",
      tags: ["Deploy"],
      operationId: "deployPrebuilt",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletHeaderSchema,
      hide: true,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractType } = request.params;
      const { contractMetadata, version } = request.body;
      const chainId = await getChainIdFromChain(chain);
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletHeaderSchema>;

      const sdk = await getSdk({ chainId, walletAddress, accountAddress });
      const tx = await sdk.deployer.deployBuiltInContract.prepare(
        contractType,
        contractMetadata,
        version,
      );
      const deployedAddress = await tx.simulate();

      const queueId = await queueTx({
        tx,
        chainId,
        extension: "deploy-prebuilt",
        idempotencyKey,
      });

      reply.status(StatusCodes.OK).send({
        deployedAddress,
        queueId,
      });
    },
  });
}
