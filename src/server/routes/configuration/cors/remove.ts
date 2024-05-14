import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { mandatoryAllowedCorsUrls } from "../../../utils/cors-urls";
import { ReplySchema } from "./get";

const BodySchema = Type.Object({
  urlsToRemove: Type.Array(
    Type.String({
      description: "Comma separated list of origins to remove",
    }),
  ),
});

BodySchema.examples = [
  {
    urlsToRemove: ["https://example.com", "https://subdomain.example.com"],
  },
];

export async function removeUrlToCorsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "DELETE",
    url: "/configuration/cors",
    schema: {
      summary: "Remove CORS URLs",
      description: "Remove URLs from CORS configuration",
      tags: ["Configuration"],
      operationId: "removeUrlToCorsConfiguration",
      body: BodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const currentConfig = await getConfig();

      const urlsToRemove = req.body.urlsToRemove.map((url) => url.trim());

      // Check for mandatory URLs
      const containsMandatoryUrl = urlsToRemove.some((url) =>
        mandatoryAllowedCorsUrls.includes(url),
      );
      if (containsMandatoryUrl) {
        throw new Error(
          `Cannot remove URLs: ${mandatoryAllowedCorsUrls.join(",")}`,
        );
      }

      // Filter out URLs to be removed
      const newAllowOriginsList = currentConfig.accessControlAllowOrigin
        .split(",")
        .map((url) => url.trim())
        .filter((url) => !urlsToRemove.includes(url));

      await updateConfiguration({
        accessControlAllowOrigin: [...new Set([...newAllowOriginsList])].join(
          ",",
        ),
      });

      // Fetch and return the updated configuration
      const newConfig = await getConfig(false);
      res
        .status(200)
        .send({ result: newConfig.accessControlAllowOrigin.split(",") });
    },
  });
}
