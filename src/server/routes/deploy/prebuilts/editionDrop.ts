import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { Address } from "thirdweb";
import { queueTx } from "../../../../shared/db/transactions/queueTx";
import { getSdk } from "../../../../shared/utils/cache/getSdk";
import { contractDeployBasicSchema } from "../../../schemas/contract";
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
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../schemas/wallet";
import { getChainIdFromChain } from "../../../utils/chain";

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
  ...contractDeployBasicSchema.properties,
  ...txOverridesWithValueSchema.properties,
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    contractMetadata: {
      name: "My Edition Drop",
      symbol: "EDD",
      primary_sale_recipient: "<your-wallet-address>",
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
      operationId: "deployEditionDrop",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletWithAAHeaderSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain } = request.params;
      const {
        contractMetadata,
        version,
        txOverrides,
        saltForProxyDeploy,
        forceDirectDeploy,
        compilerOptions,
      } = request.body;
      const chainId = await getChainIdFromChain(chain);
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const sdk = await getSdk({ chainId, walletAddress, accountAddress });
      const tx = await sdk.deployer.deployBuiltInContract.prepare(
        "edition-drop",
        contractMetadata,
        version,
        {
          saltForProxyDeploy,
          forceDirectDeploy,
          compilerOptions,
        },
      );
      const deployedAddress = (await tx.simulate()) as Address;

      const queueId = await queueTx({
        tx,
        chainId,
        extension: "deploy-prebuilt",
        deployedContractAddress: deployedAddress,
        deployedContractType: "edition-drop",
        idempotencyKey,
        txOverrides,
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
