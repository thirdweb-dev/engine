import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllWallets } from "../../../src/db/wallets/getAllWallets";
import {
  standardResponseSchema,
  walletDetailsSchema,
} from "../../helpers/sharedApiSchemas";

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(walletDetailsSchema),
});

responseSchema.example = {
  result: [
    {
      address: "0xe201a491a204e4a78e60033ae8ed39036b55bacb",
      type: "local",
      label: "my-wallet",
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
    url: "/backend-wallet/get-all",
    schema: {
      summary: "Get all backend wallets",
      description: "Get all backend wallets.",
      tags: ["Backend Wallet"],
      operationId: "getAll",
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
