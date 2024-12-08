import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "thirdweb";
import { mintTo } from "thirdweb/extensions/erc721";
import type { NFTInput } from "thirdweb/utils";
import { getChain } from "../../../../../../utils/chain";
import { thirdwebClient } from "../../../../../../utils/sdk";
import { queueTransaction } from "../../../../../../utils/transaction/queueTransation";
import { AddressSchema } from "../../../../../schemas/address";
import { nftOrInputSchema } from "../../../../../schemas/nft";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import {
  maybeAddress,
  requiredAddress,
  walletWithAAHeaderSchema,
} from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  receiver: {
    ...AddressSchema,
    description: "Address of the wallet to mint the NFT to",
  },
  metadata: nftOrInputSchema,
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    receiver: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    metadata: {
      name: "My NFT",
      description: "My NFT description",
      image: "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
    },
  },
];

export async function erc721mintTo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc721/mint-to",
    schema: {
      summary: "Mint tokens",
      description: "Mint ERC-721 tokens to a specific wallet.",
      tags: ["ERC721"],
      operationId: "erc721-mintTo",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletWithAAHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain: _chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { receiver, metadata, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": fromAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-factory-address": accountFactoryAddress,
        "x-account-salt": accountSalt,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(_chain);
      const chain = await getChain(chainId);

      const contract = getContract({
        chain,
        client: thirdwebClient,
        address: contractAddress,
      });

      // Backward compatibility: This endpoint body uses the v4 SDK shape.
      // Transform to v5 SDK shape to use the v5 endpoint.
      const nft: NFTInput | string =
        typeof metadata === "string"
          ? metadata
          : ({
              name: metadata.name?.toString() ?? undefined,
              description: metadata.description ?? undefined,
              image: metadata.image ?? undefined,
              animation_url: metadata.animation_url ?? undefined,
              external_url: metadata.external_url ?? undefined,
              background_color: metadata.background_color ?? undefined,
              properties: metadata.properties,
            } satisfies NFTInput);
      const transaction = mintTo({
        contract,
        to: receiver,
        nft,
      });

      const queueId = await queueTransaction({
        transaction,
        fromAddress: requiredAddress(fromAddress, "x-backend-wallet-address"),
        toAddress: maybeAddress(contractAddress, "to"),
        accountAddress: maybeAddress(accountAddress, "x-account-address"),
        accountFactoryAddress: maybeAddress(
          accountFactoryAddress,
          "x-account-factory-address",
        ),
        accountSalt,
        txOverrides,
        idempotencyKey,
        shouldSimulate: simulateTx,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
