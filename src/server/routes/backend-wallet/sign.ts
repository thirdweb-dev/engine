import { Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { getWallet } from "../../../utils/cache/getWallet";
import { walletAuthSchema } from "../../schemas/wallet";

export async function sign(fastify: FastifyInstance) {
  fastify.route({
    method: "POST",
    url: "/backend-wallet/sign",
    schema: {
      headers: Type.Omit(walletAuthSchema, ["x-account-address"]),
    },
    handler: async (req, res) => {
      const walletAddress = req.headers["x-backend-wallet-address"] as string;

      const wallet = await getWallet({
        chainId: 1,
        walletAddress,
      });

      const signer = await wallet.getSigner();
    },
  });
}
