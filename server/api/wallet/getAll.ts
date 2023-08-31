import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../../core";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { walletParamSchema } from "../../schemas/wallet";

// INPUTS
const requestSchema = walletParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({}),
});

responseSchema.example = {
  result: {},
};

export async function getAll(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/wallet/getAll",
    schema: {
      description: "Get all created EOA wallet",
      tags: ["Wallet"],
      operationId: "wallet_getAll",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, walletAddress } = request.params;

      const sdk = await getSDK(network, walletAddress);

      let balanceData = await sdk.wallet.balance();
      let address = await sdk.wallet.getAddress();

      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress: address,
          ...balanceData,
          value: balanceData.value.toString(),
        },
      });
    },
  });
}
