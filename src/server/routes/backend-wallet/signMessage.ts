import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getWallet } from "../../../utils/cache/getWallet";
import { walletAuthSchema } from "../../schemas/wallet";

const BodySchema = Type.Object({
  message: Type.String(),
});

const ReplySchema = Type.Object({
  result: Type.String(),
});

export async function signMessage(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/sign-message",
    schema: {
      summary: "Sign a message",
      description: "Send a message",
      tags: ["Backend Wallet"],
      operationId: "signMessage",
      body: BodySchema,
      headers: Type.Omit(walletAuthSchema, ["x-account-address"]),
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { message } = req.body;
      const walletAddress = req.headers["x-backend-wallet-address"] as string;

      const wallet = await getWallet({
        chainId: 1,
        walletAddress,
      });

      const signer = await wallet.getSigner();
      const signedMessage = await signer.signMessage(message);

      res.status(200).send({
        result: signedMessage,
      });
    },
  });
}
