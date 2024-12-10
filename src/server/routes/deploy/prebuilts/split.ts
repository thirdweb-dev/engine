import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { Address } from "thirdweb";
import { queueTx } from "../../../../shared/db/transactions/queue-tx";
import { getSdk } from "../../../../shared/utils/cache/getSdk";
import { contractDeployBasicSchema } from "../../../schemas/contract";
import {
  commonContractSchema,
  commonTrustedForwarderSchema,
  prebuiltDeployContractParamSchema,
  prebuiltDeployResponseSchema,
  splitRecipientInputSchema,
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
    recipients: Type.Array(splitRecipientInputSchema),
    ...commonTrustedForwarderSchema.properties,
  }),
  ...contractDeployBasicSchema.properties,
  ...txOverridesWithValueSchema.properties,
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    contractMetadata: {
      name: "My Split",
      recipients: [
        {
          recipient: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
          percent: 50,
        },
        {
          recipient: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
          percent: 50,
        },
      ],
    },
  },
];
// OUTPUT
const responseSchema = prebuiltDeployResponseSchema;

export async function deployPrebuiltSplit(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/deploy/:chain/prebuilts/split",
    schema: {
      summary: "Deploy Split",
      description: "Deploy a Split contract.",
      tags: ["Deploy"],
      operationId: "deploySplit",
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
        "split",
        contractMetadata,
        version,
        { saltForProxyDeploy, forceDirectDeploy, compilerOptions },
      );
      const deployedAddress = (await tx.simulate()) as Address;
      const queueId = await queueTx({
        tx,
        chainId,
        extension: "deploy-prebuilt",
        deployedContractAddress: deployedAddress,
        deployedContractType: "split",
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
