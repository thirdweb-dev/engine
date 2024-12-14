import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { Address } from "thirdweb";
import { queueTx } from "../../../shared/db/transactions/queue-tx";
import { getSdk } from "../../../shared/utils/cache/get-sdk";
import { AddressSchema } from "../../schemas/address";
import { contractDeployBasicSchema } from "../../schemas/contract";
import {
  prebuiltDeployParamSchema,
  standardResponseSchema,
} from "../../schemas/shared-api-schemas";
import { txOverridesWithValueSchema } from "../../schemas/tx-overrides";
import { walletWithAAHeaderSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";
import { getTransactionCredentials } from "../../../shared/lib/transaction/transaction-credentials";

// INPUTS
const requestSchema = prebuiltDeployParamSchema;
const requestBodySchema = Type.Object({
  // TODO need to type this
  contractMetadata: Type.Any({
    description: "Arguments for the deployment.",
  }),
  ...contractDeployBasicSchema.properties,
  ...txOverridesWithValueSchema.properties,
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
  deployedAddress: Type.Optional(AddressSchema),
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
      headers: walletWithAAHeaderSchema,
      hide: true,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractType } = request.params;
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
      const credentials = getTransactionCredentials(request);

      const sdk = await getSdk({ chainId, walletAddress, accountAddress });
      const tx = await sdk.deployer.deployBuiltInContract.prepare(
        contractType,
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
        idempotencyKey,
        txOverrides,
        credentials,
      });

      reply.status(StatusCodes.OK).send({
        deployedAddress,
        queueId,
      });
    },
  });
}
