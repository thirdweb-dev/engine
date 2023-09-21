import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../../core/schema";
import { queueTx } from "../../../../src/db/transactions/queueTx";
import { standardResponseSchema } from "../../../helpers/sharedApiSchemas";
import {
  commonContractSchema,
  commonPlatformFeeSchema,
  commonTrustedForwarderSchema,
  prebuiltDeployContractParamSchema,
  prebuiltDeployResponseSchema,
} from "../../../schemas/prebuilts";
import { txOverridesForWriteRequest } from "../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../utilities/chain";
import { getSdk } from "../../../utils/cache/getSdk";

// INPUTS
const requestSchema = prebuiltDeployContractParamSchema;
const requestBodySchema = Type.Object({
  contractMetadata: Type.Object({
    ...commonContractSchema.properties,
    ...commonPlatformFeeSchema.properties,
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

export async function deployPrebuiltMarketplaceV3(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/deploy/:network/prebuilts/marketplace-v3",
    schema: {
      description: "Deploy prebuilt Marketplace-V3 contract",
      tags: ["Deploy"],
      operationId: "deployPrebuiltMarketplaceV3",
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
      const { contractMetadata, version } = request.body;
      const chainId = getChainIdFromChain(network);
      const walletAddress = request.headers["x-wallet-address"] as string;

      const sdk = await getSdk({ chainId, walletAddress });
      const tx = await sdk.deployer.deployBuiltInContract.prepare(
        "marketplace-v3",
        contractMetadata,
        version,
      );
      const deployedAddress = await tx.simulate();

      const queuedId = await queueTx({
        tx,
        chainId,
        extension: "deploy-prebuilt",
        deployedContractAddress: deployedAddress,
        deployedContractType: "marketplace-v3",
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
