import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { responseBodySchema } from "./get";

const requestBodySchema = Type.Object({
  ips: Type.Array(
    Type.String({
      minLength: 7,
      description: "IP Address as a string",
    }),
    {
      description: "Array of IP addresses to allowlist",
    },
  ),
});

requestBodySchema.examples = [
  {
    ips: ["8.8.8.8", "172.217.255.255"],
  },
];

export async function setIpAllowlist(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "PUT",
    url: "/configuration/ip-allowlist",
    schema: {
      summary: "Set IP Allowlist",
      description:
        "Replaces the IP Allowlist array to allow client-side calls to Engine",
      tags: ["Configuration"],
      operationId: "setIpAllowlist",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const ips = req.body.ips.map((ip) => ip.trim());

      // Add required domains and dedupe.
      const dedupe = Array.from(new Set([...ips]));

      await updateConfiguration({
        ipAllowlist: dedupe,
      });

      // Fetch and return the updated configuration
      const config = await getConfig(false);
      res.status(200).send({
        result: config.ipAllowlist,
      });
    },
  });
}
