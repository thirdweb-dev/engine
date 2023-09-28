import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../../../../core/schema";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { txOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

// INPUTS
const requestSchema = erc1155ContractParamSchema;
const requestBodySchema = Type.Object({
  token_id: Type.String({
    description: "Token ID of the NFT to airdrop",
  }),
  addresses: Type.Array(
    Type.Object({
      address: Type.String(),
      quantity: Type.String({
        default: "1",
      }),
    }),
    {
      description: "Addresses and quantities to airdrop to",
    },
  ),
  ...txOverridesForWriteRequest.properties,
});

requestBodySchema.examples = [
  {
    token_id: "0",
    addresses: [
      {
        address: "0xE79ee09bD47F4F5381dbbACaCff2040f2FbC5803",
        quantity: "1",
      },
      {
        address: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
        quantity: "1",
      },
    ],
  },
];

export async function erc1155airdrop(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contract_address/erc1155/airdrop",
    schema: {
      description: "Airdrop a ERC1155 NFT to multiple wallets.",
      tags: ["ERC1155"],
      operationId: "erc1155_airdrop",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { token_id, addresses } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.erc1155.airdrop.prepare(token_id, addresses);
      const queueId = await queueTx({ tx, chainId, extension: "erc1155" });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
