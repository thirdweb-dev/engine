import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { mandatoryAllowedCorsUrls } from "../../../utils/cors-urls";
import { ReplySchema } from "./get";

const BodySchema = Type.Object({
  urlsToRemove: Type.String({
    description: "Comma separated list urls",
  }),
});

BodySchema.examples = [
  {
    urlsToRemove: "https://example.com,https://example2.com",
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
      summary: "Remove Url from CORS configuration",
      description: "Remove Url from CORS configuration",
      tags: ["Configuration"],
      operationId: "removeUrlToCorsConfiguration",
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const currentConfig = await getConfig();

      const urlsToRemove = req.body.urlsToRemove
        .split(",")
        .map((url) => url.trim());

      // Check for mandatory URLs
      const containsMandatoryUrl = urlsToRemove.some((url) =>
        mandatoryAllowedCorsUrls.includes(url),
      );
      if (containsMandatoryUrl) {
        throw new Error(
          `Cannot remove mandatory URLs: ${mandatoryAllowedCorsUrls.join(
            ", ",
          )}`,
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
