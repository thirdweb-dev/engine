import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { getContractInstance } from "../../../../../../core/index";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { queueTransaction } from "../../../../../helpers";
import { signature1155OutputSchema } from "../../../../../schemas/nft";
import { SignedPayload1155 } from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  payload: signature1155OutputSchema,
  signature: Type.String(),
});

requestBodySchema.examples = [
  {
    payload: {},
    signature: "",
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
      const { payload, signature } = request.body;
      const contract = await getContractInstance(network, contract_address);

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
      const queuedId = await queueTransaction(request, tx, network, "erc721");
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
