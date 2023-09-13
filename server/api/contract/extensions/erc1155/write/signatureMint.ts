import { Static, Type } from "@sinclair/typebox";
import { SignedPayload1155 } from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../core/index";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { signature1155OutputSchema } from "../../../../../schemas/nft";
import { web3APIOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../../../utilities/chain";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  payload: signature1155OutputSchema,
  signature: Type.String(),
  ...web3APIOverridesForWriteRequest.properties,
});

requestBodySchema.examples = [
  {
    payload: {},
    signature: "",
    web3api_overrides: {
      from: "0x...",
    },
  },
];

export async function erc1155SignatureMint(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:network/:contract_address/erc1155/signature/mint",
    schema: {
      description: "Mint tokens from a previously generated signature.",
      tags: ["ERC1155"],
      operationId: "erc1155_signature_mint",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { payload, signature, web3api_overrides } = request.body;

      const contract = await getContractInstance(
        network,
        contract_address,
        web3api_overrides?.from,
      );
      const chainId = getChainIdFromChain(network);

      const signedPayload: SignedPayload1155 = {
        payload: {
          ...payload,
          royaltyBps: BigNumber.from(payload.royaltyBps),
          quantity: BigNumber.from(payload.quantity),
          mintStartTime: BigNumber.from(payload.mintStartTime),
          mintEndTime: BigNumber.from(payload.mintEndTime),
          tokenId: BigNumber.from(payload.tokenId),
        },
        signature,
      };
      const tx = await contract.erc1155.signature.mint.prepare(signedPayload);
      const queuedId = await queueTx({ tx, chainId, extension: "erc1155" });
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
