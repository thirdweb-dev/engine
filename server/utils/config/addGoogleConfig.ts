import { Static } from "@sinclair/typebox";
import { EngineConfigSchema } from "../../schemas/config";

export const addGoogleConfig = async (
  data: Static<typeof EngineConfigSchema>["gcp"],
): Promise<string> => {
  if (
    !data?.google_application_credential_email ||
    !data?.google_application_credential_private_key ||
    !data?.google_application_project_id ||
    !data?.google_kms_key_ring_id ||
    !data?.google_kms_location_id
  ) {
    throw new Error(`Missing Values for Google Config Storage`);
  }

  // ToDo

  return "";
};
