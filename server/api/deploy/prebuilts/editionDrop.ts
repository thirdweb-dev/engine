import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../../core/schema";
import { queueTx } from "../../../../src/db/transactions/queueTx";
import { standardResponseSchema } from "../../../helpers/sharedApiSchemas";
import {
  commonContractSchema,
  commonPlatformFeeSchema,
  commonPrimarySaleSchema,
  commonRoyaltySchema,
  commonSymbolSchema,
  commonTrustedForwarderSchema,
  merkleSchema,
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
    ...commonRoyaltySchema.properties,
    ...merkleSchema.properties,
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
  ...txOverridesForWriteRequest.properties,
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    contractMetadata: {
      name: "My Edition Drop",
      symbol: "EDD",
      primary_sale_recipient: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    },
  },
];
// OUTPUT
const responseSchema = prebuiltDeployResponseSchema;

export async function deployPrebuiltEditionDrop(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/deploy/:chain/prebuilts/edition-drop",
    schema: {
      summary: "Deploy Edition Drop",
      description: "Deploy an Edition Drop contract.",
      tags: ["Deploy"],
      operationId: "deployPrebuiltEditionDrop",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const { contractMetadata, version } = request.body;
      const chainId = getChainIdFromChain(chain);
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;

      const sdk = await getSdk({ chainId, walletAddress, accountAddress });
      const tx = await sdk.deployer.deployBuiltInContract.prepare(
        "edition-drop",
        contractMetadata,
        version,
      );
      const deployedAddress = await tx.simulate();
      const queueId = await queueTx({
        tx,
        chainId,
        extension: "deploy-prebuilt",
        deployedContractAddress: deployedAddress,
        deployedContractType: "edition-drop",
      });

      reply.status(StatusCodes.OK).send({
        result: {
          deployedAddress,
          queueId,
        },
      });
    },
  });
}
