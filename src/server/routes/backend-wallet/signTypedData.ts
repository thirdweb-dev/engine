import type { TypedDataSigner } from "@ethersproject/abstract-signer";
import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getWallet } from "../../../utils/cache/getWallet";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../schemas/wallet";

const BodySchema = Type.Object({
  domain: Type.Object({}, { additionalProperties: true }),
  types: Type.Object({}, { additionalProperties: true }),
  value: Type.Object({}, { additionalProperties: true }),
  isBytes: Type.Optional(Type.Boolean()),
});

const ReplySchema = Type.Object({
  result: Type.String(),
});

export async function signTypedData(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/sign-typed-data",
    schema: {
      summary: "Sign a EIP-712 message",
      description: "Send a EIP-712 message",
      tags: ["Backend Wallet"],
      operationId: "signTypedData",
      body: BodySchema,
      headers: Type.Omit(walletAuthSchema, ["x-account-address"]),
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { domain, value, types, isBytes } = req.body;
      const walletAddress = req.headers["x-backend-wallet-address"] as string;

      const wallet = await getWallet({ chainId: 1, walletAddress });

      const signer = (await wallet.getSigner()) as unknown as TypedDataSigner;
      const result = await signer._signTypedData(domain, types, value);

      res.status(200).send({
        result: result,
      });
    },
  });
}
