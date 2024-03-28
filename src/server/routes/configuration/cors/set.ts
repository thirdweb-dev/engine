import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { mandatoryAllowedCorsUrls } from "../../../utils/cors-urls";
import { ReplySchema } from "./get";

const BodySchema = Type.Object({
  urls: Type.Array(
    Type.String({
      description: "Comma separated list of origins that will call Engine",
      minLength: 1,
    }),
  ),
});

BodySchema.examples = [
  {
    urls: ["https://example.com", "https://subdomain.example.com"],
  },
];

export async function setUrlsToCorsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "PUT",
    url: "/configuration/cors",
    schema: {
      summary: "Set CORS URLs",
      description:
        "Replaces the CORS URLs to allow client-side calls to Engine",
      tags: ["Configuration"],
      operationId: "setUrlsToCorsConfiguration",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const urls = req.body.urls.map((url) => url.trim());

      // Add required domains and dedupe.
      const dedupe = Array.from(
        new Set([...urls, ...mandatoryAllowedCorsUrls]),
      );

      console.log("[DEBUG] urls", urls);
      console.log("[DEBUG] dedupe", dedupe);

      await updateConfiguration({
        accessControlAllowOrigin: dedupe.join(","),
      });

      // Fetch and return the updated configuration
      const config = await getConfig(false);
      res.status(200).send({
        result: config.accessControlAllowOrigin.split(","),
      });
    },
  });
}
