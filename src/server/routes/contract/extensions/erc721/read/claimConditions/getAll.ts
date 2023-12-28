import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../../utils/cache/getContract";
import {
  contractParamSchema,
  currencyValueSchema,
  standardResponseSchema,
} from "../../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../../utils/chain";

// INPUT
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  withAllowList: Type.Boolean({
    description:
      "Provide a boolean value to include the allowlist in the response.",
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.Array(
    Type.Object({
      maxClaimableSupply: Type.String(),
      startTime: Type.Date(),
      price: Type.String(),
      currencyAddress: Type.String(),
      maxClaimablePerWallet: Type.String(),
      waitInSeconds: Type.String(),
      merkleRootHash: Type.Union([Type.String(), Type.Array(Type.Number())]),
      availableSupply: Type.String(),
      currentMintSupply: Type.String(),
      currencyMetadata: currencyValueSchema,
      metadata: Type.Optional(Type.Any()),
      snapshot: Type.Optional(
        Type.Union([
          Type.Null(),
          Type.Undefined(),
          Type.Array(
            Type.Object({
              price: Type.Optional(Type.String()),
              currencyAddress: Type.Optional(Type.String()),
              address: Type.String(),
              maxClaimable: Type.String(),
            }),
          ),
        ]),
      ),
    }),
  ),
});

// LOGIC
export async function erc721ClaimContitionsGetAll(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc721/claim-conditions/get-all",
    schema: {
      summary: "Get all the claim phases configured for the drop.",
      description: "Get all the claim phases configured for the drop.",
      tags: ["ERC721"],
      operationId: "claimConditionsGetAll",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { withAllowList } = request.body;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const returnData = await contract.erc721.claimConditions.getAll({
        withAllowList,
      });

      const sanitizedReturnData = returnData.map((item) => {
        return {
          ...item,
          price: item.price.toString(),
          waitInSeconds: item.waitInSeconds.toString(),
          currencyMetadata: {
            ...item.currencyMetadata,
            value: item.currencyMetadata.value.toString(),
          },
        };
      });

      reply.status(StatusCodes.OK).send({
        result: sanitizedReturnData,
      });
    },
  });
}
