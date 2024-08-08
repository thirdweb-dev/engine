import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Address } from "thirdweb";
import { queueTx } from "../../../../db/transactions/queueTx";
import { getSdk } from "../../../../utils/cache/getSdk";
import { contractDeployBasicSchema } from "../../../schemas/contract";
import {
  commonContractSchema,
  commonPlatformFeeSchema,
  commonPrimarySaleSchema,
  commonRoyaltySchema,
  commonSymbolSchema,
  commonTrustedForwarderSchema,
  prebuiltDeployContractParamSchema,
  prebuiltDeployResponseSchema,
} from "../../../schemas/prebuilts/index";
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
      name: "My Edition",
      symbol: "ED",
      primary_sale_recipient: "<your-wallet-address>",
    },
  },
];

// OUTPUT
const responseSchema = prebuiltDeployResponseSchema;

export async function deployPrebuiltEdition(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/deploy/:chain/prebuilts/edition",
    schema: {
      summary: "Deploy Edition",
      description: "Deploy an Edition contract.",
      tags: ["Deploy"],
      operationId: "deployEdition",
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
        "edition",
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
        deployedContractType: "edition",
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
