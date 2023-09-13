import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../../../core";
<<<<<<< HEAD
import { walletAuthSchema } from "../../../../core/schema";
=======
>>>>>>> am/v2
import { queueTx } from "../../../../src/db/transactions/queueTx";
import { standardResponseSchema } from "../../../helpers/sharedApiSchemas";
import {
  commonContractSchema,
  commonRoyaltySchema,
  commonSymbolSchema,
  commonTrustedForwarderSchema,
  prebuiltDeployContractParamSchema,
  prebuiltDeployResponseSchema,
} from "../../../schemas/prebuilts";
<<<<<<< HEAD
import { txOverridesForWriteRequest } from "../../../schemas/web3api-overrides";
=======
import { web3APIOverridesForWriteRequest } from "../../../schemas/web3api-overrides";
>>>>>>> am/v2
import { getChainIdFromChain } from "../../../utilities/chain";

// INPUTS
const requestSchema = prebuiltDeployContractParamSchema;
const requestBodySchema = Type.Object({
  contractMetadata: Type.Object({
    ...commonContractSchema.properties,
    ...commonRoyaltySchema.properties,
    ...commonSymbolSchema.properties,
    ...commonTrustedForwarderSchema.properties,
  }),
  version: Type.Optional(
    Type.String({
      description: "Version of the contract to deploy. Defaults to latest.",
    }),
  ),
  ...txOverridesForWriteRequest.properties,
});

// Example for the Request Body

// OUTPUT
const responseSchema = prebuiltDeployResponseSchema;

export async function deployPrebuiltMultiwrap(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/deployer/:network/prebuilts/multiwrap",
    schema: {
      description: "Deploy prebuilt Multiwrap contract",
      tags: ["Deploy"],
      operationId: "deployPrebuiltMultiwrap",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network } = request.params;
<<<<<<< HEAD
      const { contractMetadata, version, tx_overrides } = request.body;
      const chainId = getChainIdFromChain(network);
      const walletAddress = request.headers["x-wallet-address"] as string;

      const sdk = await getSDK(network, walletAddress);
=======
      const { contractMetadata, version, web3api_overrides } = request.body;
      const chainId = getChainIdFromChain(network);

      const sdk = await getSDK(network, web3api_overrides?.from);
>>>>>>> am/v2
      const tx = await sdk.deployer.deployBuiltInContract.prepare(
        "multiwrap",
        contractMetadata,
        version,
      );
      const deployedAddress = await tx.simulate();
      const queuedId = await queueTx({
        tx,
        chainId,
        extension: "deploy-prebuilt",
        deployedContractAddress: deployedAddress,
        deployedContractType: "multiwrap",
      });
      reply.status(StatusCodes.OK).send({
        result: {
          deployedAddress,
          queuedId,
        },
      });
    },
  });
}
