import { assert } from "vitest";

const TEST_GCP_KMS_RESOURCE_PATH = process.env.TEST_GCP_KMS_RESOURCE_PATH;
const TEST_GCP_KMS_EMAIL = process.env.TEST_GCP_KMS_EMAIL;
const TEST_GCP_KMS_PK = process.env.TEST_GCP_KMS_PK;

assert(TEST_GCP_KMS_RESOURCE_PATH, "TEST_GCP_KMS_RESOURCE_PATH is required");
assert(TEST_GCP_KMS_EMAIL, "TEST_GCP_KMS_EMAIL is required");
assert(TEST_GCP_KMS_PK, "TEST_GCP_KMS_PK is required");

export const TEST_GCP_KMS_CONFIG = {
  resourcePath: TEST_GCP_KMS_RESOURCE_PATH,
  email: TEST_GCP_KMS_EMAIL,
  pk: TEST_GCP_KMS_PK,
};
