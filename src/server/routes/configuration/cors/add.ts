import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { mandatoryAllowedCorsUrls } from "../../../utils/cors-urls";
import { ReplySchema } from "./get";

const BodySchema = Type.Object({
  urlsToAdd: Type.String({
    description:
      "Comma separated list of origins to allow CORS for. Thirdweb URLs are automatically added.",
    minLength: 1,
  }),
});

BodySchema.examples = [
  {
    urlsToAdd: "https://example.com,https://example2.com",
  },
];

export async function addUrlToCorsConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/configuration/cors",
    schema: {
      summary: "Add Url to CORS configuration",
      description: "Add Url to CORS configuration",
      tags: ["Configuration"],
      operationId: "addUrlToCorsConfiguration",
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const oldConfig = await getConfig();

      const urlsToAdd = req.body.urlsToAdd.split(",").map((url) => url.trim());

      const requiredUrls = mandatoryAllowedCorsUrls;

      requiredUrls.forEach((url) => {
        if (!urlsToAdd.includes(url)) {
          urlsToAdd.push(url);
        }
      });

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
      res.status(200).send({
        result: config.accessControlAllowOrigin.split(","),
      });
    },
  });
}
