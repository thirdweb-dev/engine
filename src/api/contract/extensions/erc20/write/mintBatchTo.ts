import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { getSDK } from "../../../../../../core/index";
import {
  contractParamSchema,
  standardResponseSchema,
  baseReplyErrorSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { queueTransaction } from "../../../../../helpers";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  data: Type.Array(Type.Object({
    toAddress: Type.String({
      description: "The address to mint tokens to",
    }),
    amount: Type.String({
      description: 'The number of tokens to mint to the specified address.',
    }),
  })),
});

requestBodySchema.examples = [
  {
    data: [
      {
        toAddress: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
        amount: "0.1",
      },
      {
        toAddress: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
        amount: "0.1",
      },
    ]
  }
];

// OUTPUT
const responseSchema = Type.Object({
  queuedId: Type.Optional(Type.String()),
  error: Type.Optional(baseReplyErrorSchema),
});

export async function erc20mintBatchTo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc20/mintBatchTo",
    schema: {
      description: "Mint tokens to many wallets in one transaction.",
      tags: ["ERC20"],
      operationId: "erc20_mintBatchTo",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { data } = request.body;
      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);
      const tx = await contract.erc20.mintBatchTo.prepare(data);
      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "erc20",
      );
      reply.status(StatusCodes.OK).send({
        queuedId,
      });
    },
  });
}
