import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { sdkCache } from "../../../../utils/cache/getSdk";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { responseBodySchema } from "./get";

const requestBodySchema = Type.Object({
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

requestBodySchema.examples = [
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
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/configuration/chains",
    schema: {
      summary: "Update chain overrides configuration",
      description: "Update chain overrides configuration",
      tags: ["Configuration"],
      operationId: "updateChainsConfiguration",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      await updateConfiguration({
        chainOverrides: JSON.stringify(req.body.chainOverrides),
      });

      const config = await getConfig(false);
      sdkCache.clear();
      res.status(200).send({
        result: config.chainOverrides,
      });
    },
  });
}
