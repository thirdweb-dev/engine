import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { Address } from "thirdweb";
import { queueTx } from "../../../../shared/db/transactions/queue-tx.js";
import { getSdk } from "../../../../shared/utils/cache/get-sdk.js";
import { contractDeployBasicSchema } from "../../../schemas/contract/index.js";
import {
  commonContractSchema,
  commonPlatformFeeSchema,
  commonPrimarySaleSchema,
  commonRoyaltySchema,
  commonSymbolSchema,
  commonTrustedForwarderSchema,
  prebuiltDeployContractParamSchema,
  prebuiltDeployResponseSchema,
} from "../../../schemas/prebuilts/index.js";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas.js";
import { txOverridesWithValueSchema } from "../../../schemas/tx-overrides.js";
import { walletWithAAHeaderSchema } from "../../../schemas/wallet/index.js";
import { getChainIdFromChain } from "../../../utils/chain.js";

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
