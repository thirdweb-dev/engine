import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import { prebuiltDeployResponseSchema } from "../../../../../schemas/prebuilts";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { getContract } from "../../../../../utils/cache/getContract";
import { getChainIdFromChain } from "../../../../../utils/chain";

const BodySchema = Type.Object({
  adminAddress: Type.String({
    description: "The admin address to create an account for",
  }),
  extraData: Type.Optional(
    Type.String({
      description: "Extra data to add to use in creating the account address",
    }),
  ),
});

BodySchema.examples = [
  {
    adminAddress: "0x3ecdbf3b911d0e9052b64850693888b008e18373",
  },
];

export const createAccount = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof prebuiltDeployResponseSchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/account-factory/create-account",
    schema: {
      summary: "Create smart account",
      description: "Create a smart account for this account factory.",
      tags: ["Account Factory"],
      operationId: "createAccount",
      params: contractParamSchema,
      headers: walletAuthSchema,
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: prebuiltDeployResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { adminAddress, extraData } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        walletAddress,
        contractAddress,
        accountAddress,
      });
      const tx = await contract.accountFactory.createAccount.prepare(
        adminAddress,
        extraData,
      );
      const deployedAddress =
        await contract.accountFactory.predictAccountAddress(
          adminAddress,
          extraData,
        );
      const queueId = await queueTx({
        tx,
        chainId,
        extension: "account-factory",
        deployedContractAddress: deployedAddress,
        deployedContractType: "account",
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
          deployedAddress,
        },
      });
    },
  });
};
