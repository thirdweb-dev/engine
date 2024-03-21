import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../db/transactions/queueTx";
import { getContract } from "../../../../utils/cache/getContract";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../schemas/wallet";
import { txOverridesForWriteRequest } from "../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../utils/chain";

// INPUT
const writeRequestBodySchema = Type.Object({
  functionName: Type.String({
    description: "The function to call on the contract",
  }),
  args: Type.Array(
    Type.Union([
      Type.String({
        description: "The arguments to call on the function",
      }),
      Type.Tuple([Type.String(), Type.String()]),
      Type.Object({}),
      Type.Array(Type.Any()),
      Type.Any(),
    ]),
  ),
  ...txOverridesForWriteRequest.properties,
});

// Adding example for Swagger File
writeRequestBodySchema.examples = [
  {
    functionName: "transferFrom",
    args: [
      "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      "0x3EcDBF3B911d0e9052b64850693888b008e18373",
      "0",
    ],
  },
];

// LOGIC
export async function writeToContract(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof writeRequestBodySchema>;
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/write",
    schema: {
      summary: "Write to contract",
      description: "Call a write function on a contract.",
      tags: ["Contract"],
      operationId: "write",
      params: contractParamSchema,
      headers: walletAuthSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
      body: writeRequestBodySchema,
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { functionName, args, txOverrides } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.prepare(functionName, args, txOverrides);

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "none",
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
