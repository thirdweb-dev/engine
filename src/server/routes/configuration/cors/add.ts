import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../shared/db/configuration/update-configuration";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";
import { mandatoryAllowedCorsUrls } from "../../../utils/cors-urls";
import { responseBodySchema } from "./get";

const requestBodySchema = Type.Object({
  urlsToAdd: Type.Array(
    Type.String({
      description: "Comma separated list of origins that will call Engine",
      minLength: 1,
    }),
  ),
});

requestBodySchema.examples = [
  {
    urlsToAdd: ["https://example.com", "https://subdomain.example.com"],
  },
];

export async function addUrlToCorsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/configuration/cors",
    schema: {
      summary: "Add a CORS URL",
      description: "Add a URL to allow client-side calls to Engine",
      tags: ["Configuration"],
      operationId: "addUrlToCorsConfiguration",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const oldConfig = await getConfig();

      const urlsToAdd = req.body.urlsToAdd.map((url) => url.trim());

      const requiredUrls = mandatoryAllowedCorsUrls;

      for (const url of requiredUrls) {
        if (!urlsToAdd.includes(url)) {
          urlsToAdd.push(url);
        }
      }

      await updateConfiguration({
        accessControlAllowOrigin: [
          ...new Set([
            ...urlsToAdd,
            ...oldConfig.accessControlAllowOrigin.split(","),
          ]),
        ].join(","),
      });

      // Fetch and return the updated configuration
      const config = await getConfig(false);
      res.status(StatusCodes.OK).send({
        result: config.accessControlAllowOrigin.split(","),
      });
    },
  });
}
