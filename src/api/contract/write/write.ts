import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import {
  getSDK,
  connectWithDatabase,
} from "../../../../core";
import {
  baseReplyErrorSchema,
  contractParamSchema,
  standardResponseSchema,
} from "../../../helpers/sharedApiSchemas";
import { queueTransaction } from "../../../helpers";

// INPUT
const writeRequestBodySchema = Type.Object({
  function_name: Type.String({
    description: "Name of the function to call on Contract",
  }),
  args: Type.Array(
    Type.String({
      description: "Arguments for the function. Comma Separated",
    }),
  ),
});

// Adding example for Swagger File
writeRequestBodySchema.examples = [
  {
    function_name: "transferFrom",
    args: [
      "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      "0x3EcDBF3B911d0e9052b64850693888b008e18373",
      "0",
    ],
  },
];

// OUTPUT
const replyBodySchema = Type.Object({
  queuedId: Type.Optional(Type.String()),
});

// LOGIC
export async function writeToContract(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof writeRequestBodySchema>,
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof replyBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/write",
    schema: {
      description: "Write to Contract",
      tags: ["Contract"],
      operationId: "write",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: replyBodySchema,
      },
      body: writeRequestBodySchema,
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { function_name, args } = request.body;
      
      // Connect to DB
      const dbInstance = await connectWithDatabase(request);
      
      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);
      const tx = await contract.prepare(function_name, args);
      
      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "non-extension",
      );

      reply.status(StatusCodes.OK).send({
        queuedId, 
      });
    },
  });
}
