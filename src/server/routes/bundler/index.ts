import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

const ParamsSchema = Type.Object({
  bundlerId: Type.String(),
});

const UserOperationSchema = Type.Object({
  sender: Type.String(),
  nonce: Type.String(),
  initCode: Type.String(),
  callData: Type.String(),
  callGasLimit: Type.String(),
  verificationGasLimit: Type.String(),
  preVerificationGas: Type.String(),
  maxFeePerGas: Type.String(),
  maxPriorityFeePerGas: Type.String(),
  signature: Type.String(),
  paymasterAndData: Type.String(),
});

const BodySchema = Type.Union([
  Type.Object({
    id: Type.String(),
    jsonrpc: Type.String(),
    method: Type.String(),
    params: Type.Tuple([UserOperationSchema, Type.String()]),
  }),
]);

const ReplySchema = Type.Object({
  id: Type.String(),
  jsonrpc: Type.String(),
  result: Type.String(),
});

export async function bundler(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/bundler/:bundlerId",
    schema: {
      summary: "Bundler",
      description: "Bundler",
      tags: ["Bundler"],
      operationId: "bundler",
      params: ParamsSchema,
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      return;
    },
  });
}
