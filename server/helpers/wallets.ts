import { CreateKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { FastifyInstance } from "fastify";

const AWS_REGION = process.env.AWS_REGION;

const client = new KMSClient({
  region: AWS_REGION,
});

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
