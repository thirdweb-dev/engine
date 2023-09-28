import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../../../../core/schema";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers";
import { prebuiltDeployResponseSchema } from "../../../../../schemas/prebuilts";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

const BodySchema = Type.Object({
  admin_address: Type.String({
    description: "The admin address to create an account for",
  }),
  extra_data: Type.Optional(
    Type.String({
      description: "Extra data to add to use in creating the account address",
    }),
  ),
});

export const createAccount = async (fastify: FastifyInstance) => {
  fastify.route<{
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof prebuiltDeployResponseSchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contract_address/account-factory/create-account",
    schema: {
      description: "Create a new account on the account factory",
      tags: ["Account Factory"],
      operationId: "account-factory:create-account",
      params: contractParamSchema,
      headers: walletAuthSchema,
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: prebuiltDeployResponseSchema,
      },
    },
    handler: async (req, rep) => {
      const { chain, contract_address } = req.params;
      const { admin_address, extra_data } = req.body;
      const walletAddress = req.headers["x-backend-wallet-address"] as string;
      const accountAddress = req.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);

      const contract = await getContract({
        chainId,
        walletAddress,
        contractAddress: contract_address,
        accountAddress,
      });
      const tx = await contract.accountFactory.createAccount.prepare(
        admin_address,
        extra_data,
      );
      const deployedAddress =
        await contract.accountFactory.predictAccountAddress(
          admin_address,
          extra_data,
        );
      const queuedId = await queueTx({
        tx,
        chainId,
        extension: "account-factory",
        deployedContractAddress: deployedAddress,
        deployedContractType: "account",
      });

      rep.status(StatusCodes.OK).send({
        result: {
          queuedId,
          deployedAddress,
        },
      });
    },
  });
};
