import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Type, Static } from "@sinclair/typebox";
import { getSDK } from "../../../../../../core/index";
import { 
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema
} from "../../../../../helpers/sharedApiSchemas";
import { queueTransaction } from "../../../../../helpers";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  from_address: Type.String({
    description: "Address of the wallet sending the tokens",
  }),
  to_address: Type.String({
    description: "Address of the wallet you want to send the tokens to",
  }),
  amount: Type.String({
    description: "The amount of tokens you want to send",
  }),
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    from_address: "0x....",
    to_address: "0x...",
    amount: "0.1",
  },
];

// OUTPUTS

export async function erc20TransferFrom(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc20/transferFrom",
    schema: {
      description:
        "Transfer tokens from the connected wallet to another wallet.",
      tags: ["ERC20"],
      operationId: "erc20_transferFrom",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { from_address, to_address, amount } = request.body;
      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);

      const tx = await contract.erc20.transferFrom.prepare(
        from_address,
        to_address,
        amount,
      );
      
      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "erc20",
      );

      reply.status(StatusCodes.OK).send({
        queuedId
      });
    },
  });
}
