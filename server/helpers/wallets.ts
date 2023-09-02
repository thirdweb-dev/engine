import { CreateKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { KeyManagementServiceClient } from "@google-cloud/kms";
import * as protos from "@google-cloud/kms/build/protos/protos";
import { FastifyInstance } from "fastify";
import { env } from "../../core";

const AWS_REGION = process.env.AWS_REGION;

export async function createAWSKMSWallet(
  fastify: FastifyInstance,
  description: string,
): Promise<{ keyId: string; arn: string }> {
  try {
    // key input params
    const input = {
      Description: description,
      KeyUsage: "SIGN_VERIFY",
      KeySpec: "ECC_SECG_P256K1",
      MultiRegion: false,
    };
    const client = new KMSClient({
      region: AWS_REGION,
    });

    const command = new CreateKeyCommand(input);
    const response = await client.send(command);

    fastify.log.debug(
      `Created KMS Key in Region ${AWS_REGION}, KeyId: ${
        response.KeyMetadata!.KeyId
      }, KeyArn: ${response.KeyMetadata!.Arn} `,
    );

    return {
      keyId: response.KeyMetadata!.KeyId!,
      arn: response.KeyMetadata!.Arn!,
    };
  } catch (error) {
    throw error;
  }
}

export const createGCPKMSWallet =
  async (): Promise<protos.google.cloud.kms.v1.ICryptoKey> => {
    try {
      if (!env.GCP_KEY_RING_ID || !env.GCP_LOCATION_ID || !env.GCP_PROJECT_ID) {
        throw new Error(
          "GCP_KEY_RING_ID or GCP_LOCATION_ID or GCP_PROJECT_ID is not defined. Please check .env file",
        );
      }

      const kmsCredentials = {
        projectId: env.GCP_PROJECT_ID!, // your project id in gcp
        locationId: env.GCP_LOCATION_ID!, // the location where your key ring was created
        keyRingId: env.GCP_KEY_RING_ID!, // the id of the key ring
      };

      const client = new KeyManagementServiceClient({
        credentials: {
          client_email: "<email>",
          private_key: `-----BEGIN PRIVATE KEY-----\n56b46f9e79a7915977da7ee73e78aaaa1a2e4d0f\n-----END PRIVATE KEY-----\n`,
        },
        projectId: env.GCP_PROJECT_ID,
      });

      // Build the parent key ring name
      const keyRingName = client.keyRingPath(
        kmsCredentials.projectId,
        kmsCredentials.locationId,
        kmsCredentials.keyRingId,
      );
      const [key] = await client.createCryptoKey({
        parent: keyRingName,
        cryptoKeyId: `web3api-${new Date().getTime()}`,
        cryptoKey: {
          purpose: "ASYMMETRIC_SIGN",
          versionTemplate: {
            algorithm: "RSA_SIGN_PKCS1_2048_SHA256",
          },
        },
      });

      return key;
    } catch (error) {
      throw error;
    }
  };

export const getGCPPublicKey = async (name: string): Promise<string> => {
  try {
    const client = new KeyManagementServiceClient({
      credentials: {
        client_email: "<email>",
        private_key: `-----BEGIN PRIVATE KEY-----\n\n-----END PRIVATE KEY-----\n`,
      },
      projectId: env.GCP_PROJECT_ID,
    });

    const [publicKey] = await client.getPublicKey({
      name,
    });
    return publicKey.pem!;
  } catch (error) {
    throw error;
  }
};
