import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { AddressSchema } from "../../schemas/address";
import {
  currencyValueSchema,
  standardResponseSchema,
} from "../../schemas/shared-api-schemas";
import { walletWithAddressParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

import { getChain } from "../../../shared/utils/chain";
import { thirdwebClient } from "../../../shared/utils/sdk";
import { getWalletBalance } from "thirdweb/wallets";

const responseSchema = Type.Object({
  result: Type.Object({
    walletAddress: AddressSchema,
    ...currencyValueSchema.properties,
  }),
});

responseSchema.example = {
  result: {
    walletAddress: "0x...",
    name: "ERC20",
    symbol: "",
    decimals: "18",
    value: "0",
    displayValue: "0.0",
  },
};

export async function getBalance(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof walletWithAddressParamSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/backend-wallet/:chain/:walletAddress/get-balance",
    schema: {
      summary: "Get balance",
      description: "Get the native balance for a backend wallet.",
      tags: ["Backend Wallet"],
      operationId: "getBalance",
      params: walletWithAddressParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, walletAddress } = request.params;
      const chainId = await getChainIdFromChain(chain);

      const balanceData = await getWalletBalance({
        client: thirdwebClient,
        address: walletAddress,
        chain: await getChain(chainId),
      });

      reply.status(StatusCodes.OK).send({
        result: {
          walletAddress,
          ...balanceData,
          value: balanceData.value.toString(),
        },
      });
    },
  });
}
