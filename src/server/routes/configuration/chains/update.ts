import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../shared/db/configuration/update-configuration";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { sdkCache } from "../../../../shared/utils/cache/get-sdk";
import { chainResponseSchema } from "../../../schemas/chain";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { responseBodySchema } from "./get";

const requestBodySchema = Type.Object({
  chainOverrides: Type.Array(chainResponseSchema),
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
      const result: Static<typeof chainResponseSchema>[] = config.chainOverrides
        ? JSON.parse(config.chainOverrides)
        : [];

      sdkCache.clear();
      res.status(StatusCodes.OK).send({ result });
    },
  });
}
