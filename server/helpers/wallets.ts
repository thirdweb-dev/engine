import { CreateKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { KeyManagementServiceClient } from "@google-cloud/kms";
import * as protos from "@google-cloud/kms/build/protos/protos";
import { GcpKmsSigner } from "ethers-gcp-kms-signer";
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

export const createGCPKMSWallet = async (
  cryptoKeyId: string,
): Promise<protos.google.cloud.kms.v1.ICryptoKey> => {
  try {
    if (
      !env.GOOGLE_KMS_KEY_RING_ID ||
      !env.GOOGLE_KMS_LOCATION_ID ||
      !env.GOOGLE_APPLICATION_PROJECT_ID
    ) {
      throw new Error(
        "GOOGLE_KMS_KEY_RING_ID or GOOGLE_KMS_LOCATION_ID or GOOGLE_APPLICATION_PROJECT_ID is not defined. Please check .env file",
      );
    }

    const kmsCredentials = {
      projectId: env.GOOGLE_APPLICATION_PROJECT_ID!, // your project id in gcp
      locationId: env.GOOGLE_KMS_LOCATION_ID!, // the location where your key ring was created
      keyRingId: env.GOOGLE_KMS_KEY_RING_ID!, // the id of the key ring
    };

    const client = new KeyManagementServiceClient({
      credentials: {
        client_email: env.GOOGLE_APPLICATION_CREDENTIAL_EMAIL,
        private_key: env.GOOGLE_APPLICATION_CREDENTIAL_PRIVATE_KEY,
      },
      projectId: env.GOOGLE_APPLICATION_PROJECT_ID,
    });

    // Build the parent key ring name
    const keyRingName = client.keyRingPath(
      kmsCredentials.projectId,
      kmsCredentials.locationId,
      kmsCredentials.keyRingId,
    );
    const [key] = await client.createCryptoKey({
      parent: keyRingName,
      cryptoKeyId,
      cryptoKey: {
        purpose: "ASYMMETRIC_SIGN",
        versionTemplate: {
          algorithm: "EC_SIGN_SECP256K1_SHA256",
          protectionLevel: "HSM",
        },
      },
    });

    // Close the KMS client
    await client.close();

    return key;
  } catch (error) {
    throw error;
  }
};

export const getGCPKeyWalletAddress = async (keyId: string): Promise<any> => {
  try {
    // ToDo Need to change the hard-coded stuff
    const kmsCredentials = {
      projectId: env.GOOGLE_APPLICATION_PROJECT_ID!,
      locationId: env.GOOGLE_KMS_LOCATION_ID!,
      keyRingId: env.GOOGLE_KMS_KEY_RING_ID!,
      keyId,
      keyVersion: "1",
    };
    let signer = new GcpKmsSigner(kmsCredentials);
    const walletAddress = await signer.getAddress();
    return { walletAddress, keyVersionId: "1", resourcePath: keyId };
  } catch (error) {
    console.log(error);
    throw error;
  }
};
