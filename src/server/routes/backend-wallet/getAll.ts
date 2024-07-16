import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllWallets } from "../../../db/wallets/getAllWallets";
import {
  standardResponseSchema,
  walletDetailsSchema,
} from "../../schemas/sharedApiSchemas";

const QuerySchema = Type.Object({
  page: Type.Number({
    description: "The page of wallets to get.",
    examples: ["1"],
    default: "1",
  }),
  limit: Type.Number({
    description: "The number of wallets to get per page.",
    examples: ["10"],
    default: "10",
  }),
});

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
      smartAccountEOAAddress: null,
      smartAccountFactoryAddress: null,
    },
  ],
};
export async function getAll(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof QuerySchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/backend-wallet/get-all",
    schema: {
      summary: "Get all backend wallets",
      description: "Get all backend wallets.",
      tags: ["Backend Wallet"],
      operationId: "getAll",
      querystring: QuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, res) => {
      const wallets = await getAllWallets({
        page: req.query.page,
        limit: req.query.limit,
      });

      res.status(StatusCodes.OK).send({
        result: wallets,
      });
    },
  });
}
