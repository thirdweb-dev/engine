import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { sdkCache } from "../../../../utils/cache/getSdk";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { ReplySchema } from "./get";

const BodySchema = Type.Object({
  chainOverrides: Type.Array(
    Type.Object({
      name: Type.String(),
      chain: Type.String(),
      rpc: Type.Array(Type.String()),
      nativeCurrency: Type.Object({
        name: Type.String(),
        symbol: Type.String(),
        decimals: Type.Number(),
      }),
      chainId: Type.Number(),
      slug: Type.String(),
    }),
  ),
});

BodySchema.examples = [
  {
    chainOverrides: [
      {
        name: "Localhost",
        chain: "ETH",
        rpc: ["http://localhost:8545"],
        nativeCurrency: {
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
        },
        chainId: 1337,
        slug: "localhost",
      },
    ],
  },
];

export async function updateChainsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/configuration/chains",
    schema: {
      summary: "Update chain overrides configuration",
      description: "Update the engine configuration for chain overrides",
      tags: ["Configuration"],
      operationId: "updateChainsConfiguration",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      await updateConfiguration({
        chainOverrides: JSON.stringify(req.body.chainOverrides),
      });

      const config = await getConfig(false);
      sdkCache.clear();
      res.status(StatusCodes.OK).send({
        result: config.chainOverrides,
      });
    },
  });
}
