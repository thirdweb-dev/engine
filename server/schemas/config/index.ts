import { Type } from "@sinclair/typebox";

export const EngineConfigSchema = Type.Object({
  aws: Type.Optional(
    Type.Object({
      aws_access_key: Type.String({
        description: "AWS Access Key",
      }),
      aws_secret_access_key: Type.String({
        description: "AWS Secret Access Key",
      }),
      aws_region: Type.String({
        description: "AWS Region",
      }),
    }),
  ),
  gcp: Type.Optional(
    Type.Object({
      google_application_credential_private_key: Type.String({
        description: "Google Application Credential Private Key",
      }),
      google_application_project_id: Type.String({
        description: "Google Application Project ID",
      }),
      google_kms_key_ring_id: Type.String({
        description: "Google KMS Key Ring ID",
      }),
      google_kms_location_id: Type.String({
        description: "Google KMS Location ID",
      }),
      google_application_credential_email: Type.String({
        description: "Google Application Credential Email",
      }),
    }),
  ),
  local: Type.Optional(
    Type.Object({
      privateKey: Type.Optional(
        Type.String({
          description: "Private Key",
        }),
      ),
      mnemonic: Type.Optional(
        Type.String({
          description: "Mnemonic",
        }),
      ),
      encryptedJson: Type.Optional(
        Type.String({
          description: "Encrypted JSON",
        }),
      ),
      password: Type.Optional(
        Type.String({
          description: "Password",
        }),
      ),
    }),
  ),
});
