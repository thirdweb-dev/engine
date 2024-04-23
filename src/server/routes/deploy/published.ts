import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../db/transactions/queueTx";
import { getSdk } from "../../../utils/cache/getSdk";
import {
  publishedDeployParamSchema,
  standardResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { txOverrides } from "../../schemas/txOverrides";
import { walletHeaderSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";
import { isAddress } from "thirdweb";

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
  ...txOverrides.properties,
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    constructorParams: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  },
];

// OUTPUT
const responseSchema = Type.Object({
  queueId: Type.Optional(Type.String()),
  deployedAddress: Type.Optional(
    Type.String({
      description: "Not all contracts return a deployed address.",
    }),
  ),
  message: Type.Optional(Type.String()),
});

export async function deployPublished(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/deploy/:chain/:publisher/:contractName",
    schema: {
      summary: "Deploy published contract",
      description: "Deploy a published contract to the blockchain.",
      tags: ["Deploy"],
      operationId: "deployPublished",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletHeaderSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, publisher, contractName } = request.params;
      const { constructorParams, version } = request.body;
      const chainId = await getChainIdFromChain(chain);
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletHeaderSchema>;

      const sdk = await getSdk({ chainId, walletAddress, accountAddress });
      const tx = await sdk.deployer.deployPublishedContract.prepare(
        publisher,
        contractName,
        constructorParams,
        version,
      );
      const _deployedAddress = await tx.simulate();
      const deployedAddress = isAddress(_deployedAddress)
        ? _deployedAddress
        : undefined;

      const queueId = await queueTx({
        tx,
        chainId,
        extension: "deploy-published",
        deployedContractAddress: deployedAddress,
        deployedContractType: contractName,
        idempotencyKey,
      });

      reply.status(StatusCodes.OK).send({
        deployedAddress,
        queueId,
        message: !deployedAddress
          ? `To retrieve the deployed contract address, use the endpoint '/transaction/status/${queueId}' and check the value of the 'deployedContractAddress' field`
          : undefined,
      });
    },
  });
}
