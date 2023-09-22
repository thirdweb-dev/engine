import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllConfigData } from "../../../src/db/config/getAllConfigData";
import { WalletType } from "../../../src/schema/wallet";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { AWSConfig, GCPConfig } from "../../schemas/config";
import { getDecryptedAWSConfigData } from "../../utils/config/getDecryptedAWSConfig";
import { getDecryptedGoogleConfigData } from "../../utils/config/getDecryptedGoogleConfigData";

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    status: Type.String(),
    data: Type.Object({
      configType: Type.Optional(Type.String()),
      awsAccessKey: Type.Optional(
        Type.String({
          description: "AWS Access Key",
        }),
      ),
      awsSecretAccessKey: Type.Optional(
        Type.String({
          description: "AWS Secret Access Key",
        }),
      ),
      awsRegion: Type.Optional(
        Type.String({
          description: "AWS Region",
        }),
      ),
      gcpAppCredentialPrivateKey: Type.Optional(
        Type.String({
          description: "Google Application Credential Private Key",
        }),
      ),
      gcpProjectId: Type.Optional(
        Type.String({
          description: "Google Application Project ID",
        }),
      ),
      gcpKMSRingId: Type.Optional(
        Type.String({
          description: "Google KMS Key Ring ID",
        }),
      ),
      gcpLocationId: Type.Optional(
        Type.String({
          description: "Google KMS Location ID",
        }),
      ),
      gcpAppCredentialEmail: Type.Optional(
        Type.String({
          description: "Google Application Credential Email",
        }),
      ),
    }),
  }),
});

responseSchema.example = {
  result: {
    status: "success",
    data: [{}],
  },
};

export const getAllConfig = async (fastify: FastifyInstance) => {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/config/get-all",
    schema: {
      description: "Get All Engine Config Data",
      tags: ["Config"],
      operationId: "config_get_all",
      // hide: true,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (req, res) => {
      const allConfigData = await getAllConfigData({});

      if (allConfigData.length <= 0) {
        res.status(StatusCodes.OK).send({
          result: {
            status: "success",
            data: {},
          },
        });
        return;
      }

      let returnData: Partial<AWSConfig | GCPConfig> & { configType?: string } =
        {};

      if (allConfigData[0].configType === WalletType.awsKms) {
        const awsConfigData = getDecryptedAWSConfigData(
          allConfigData[0] as AWSConfig,
        );
        returnData = {
          configType: allConfigData[0].configType,
          ...awsConfigData,
        };
      } else if (allConfigData[0].configType === WalletType.gcpKms) {
        const googleConfigData = getDecryptedGoogleConfigData(
          allConfigData[0] as GCPConfig,
        );
        returnData = {
          configType: allConfigData[0].configType,
          ...googleConfigData,
        };
      }

      res.status(StatusCodes.OK).send({
        result: {
          status: "success",
          data: returnData,
        },
      });
    },
  });
};
