import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllWallets } from "../../../src/db/wallets/getAllWallets";
import {
  backendWalletSchema,
  standardResponseSchema,
} from "../../helpers/sharedApiSchemas";

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(backendWalletSchema),
});

responseSchema.example = {
  result: [
    {
      address: "0xe201a491a204e4a78e60033ae8ed39036b55bacb",
      type: "local",
      awsKmsKeyId: null,
      awsKmsArn: null,
      gcpKmsKeyId: null,
      gcpKmsKeyRingId: null,
      gcpKmsLocationId: null,
      gcpKmsKeyVersionId: null,
      gcpKmsResourcePath: null,
    },
  ],
};
export async function getAll(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/wallet/get-all",
    schema: {
      description: "Get all created EOA wallet",
      tags: ["Wallet"],
      operationId: "wallet_getAll",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const wallets = await getAllWallets();

      reply.status(StatusCodes.OK).send({
        result: wallets,
      });
    },
  });
}
