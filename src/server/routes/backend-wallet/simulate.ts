import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { simulationResponseSchema, standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../schemas/wallet";
import { SimulateTxParams, simulateTx } from "../../utils/simulateTx";
import { getChainIdFromChain } from "../../utils/chain";
import { getContract } from "../../../utils/cache/getContract";

// INPUT
const ParamsSchema = Type.Object({
  chain: Type.String(),
});

const simulationRequestBodySchema = Type.Object({
  contractAddress: Type.String({
    description: "Address of the contract",
  }),
  value: Type.String({
    examples: ["0"],
    description: "Native Currency Value",
  }),
  // Decoded transaction args
  functionName: Type.Optional(Type.String({
    description: "Name of the function to call on Contract",
  })),
  args: Type.Optional(
    Type.Array(
      Type.Union([
        Type.String({
          description: "Arguments for the function. Comma Separated",
        }),
        Type.Tuple([Type.String(), Type.String()]),
        Type.Object({}),
        Type.Array(Type.Any()),
        Type.Any(),
      ]),
    )
  ),
  // Raw transaction args
  data: Type.Optional(Type.String({
    description: "Transaction Data",
  })),
});

// Adding example for Swagger File
simulationRequestBodySchema.examples = [
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
    Params: Static<typeof ParamsSchema>;
    Body: Static<typeof simulationRequestBodySchema>;
    Reply: Static<typeof simulationResponseSchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/simulate",
    schema: {
      summary: "Simulate a transaction",
      description: "Simulate a transaction with transaction parameters",
      tags: ["Backend Wallet"],
      operationId: "simulateTransaction",
      params: ParamsSchema,
      body: simulationRequestBodySchema,
      headers: Type.Omit(walletAuthSchema, ["x-account-address"]),
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: simulationResponseSchema,
      },
    },
    handler: async (request, reply) => {
      // Destruct core params
      const { chain } = request.params;
      const { contractAddress, value, functionName, args, data } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = await getChainIdFromChain(chain);

      // Get decoded tx simulation args
      let simulationArgs: SimulateTxParams;
      if (functionName && args) {
        const contract = await getContract({
          chainId,
          contractAddress,
          walletAddress,
          accountAddress,
        });
        const tx = contract.prepare(functionName, args, { value: value ?? '0' });
        simulationArgs = { tx }
      }
      // Get raw tx simulation args
      else {
        simulationArgs = {
          txRaw: {
            chainId: chainId.toString(),
            fromAddress: walletAddress,
            toAddress: contractAddress,
            data,
            value,
          }
        }
      }

      // Simulate raw tx
      await simulateTx(simulationArgs);

      // Return success 
      reply.status(StatusCodes.OK).send({
        result: {
          success: true,
        },
      });
    },
  });
}
