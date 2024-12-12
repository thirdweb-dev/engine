import { describe, expect, it } from "vitest";
import {
  getGcpKmsResourcePath,
  splitGcpKmsResourcePath,
} from "../../src/server/utils/wallets/gcp-kms-resource-path";

describe("splitGcpKmsResourcePath", () => {
  it("should correctly split a valid GCP KMS resource path", () => {
    const resourcePath =
      "projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/my-key/cryptoKeyVersions/1";
    const result = splitGcpKmsResourcePath(resourcePath);
    expect(result).toEqual({
      projectId: "my-project",
      locationId: "us-central1",
      keyRingId: "my-keyring",
      cryptoKeyId: "my-key",
      versionId: "1",
    });
  });

  it("should throw an error for a resource path with insufficient parts", () => {
    const resourcePath =
      "projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/my-key";
    expect(() => splitGcpKmsResourcePath(resourcePath)).toThrow(
      "Invalid GCP KMS resource path",
    );
  });

  it("should handle resource paths with additional parts", () => {
    const resourcePath =
      "projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/my-key/cryptoKeyVersions/1/extra/parts";
    const result = splitGcpKmsResourcePath(resourcePath);
    expect(result).toEqual({
      projectId: "my-project",
      locationId: "us-central1",
      keyRingId: "my-keyring",
      cryptoKeyId: "my-key",
      versionId: "1",
    });
  });

  it("should handle resource paths with hyphens and numbers in IDs", () => {
    const resourcePath =
      "projects/my-project-123/locations/us-east1-b/keyRings/key-ring-2/cryptoKeys/crypto-key-3/cryptoKeyVersions/2";
    const result = splitGcpKmsResourcePath(resourcePath);
    expect(result).toEqual({
      projectId: "my-project-123",
      locationId: "us-east1-b",
      keyRingId: "key-ring-2",
      cryptoKeyId: "crypto-key-3",
      versionId: "2",
    });
  });
});

describe("getGcpKmsResourcePath", () => {
  it("should correctly construct a GCP KMS resource path", () => {
    const options = {
      projectId: "my-project",
      locationId: "us-central1",
      keyRingId: "my-keyring",
      cryptoKeyId: "my-key",
      versionId: "1",
    };
    const result = getGcpKmsResourcePath(options);
    expect(result).toBe(
      "projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/my-key/cryptoKeyVersions/1",
    );
  });

  it("should handle IDs with hyphens and numbers", () => {
    const options = {
      projectId: "my-project-123",
      locationId: "us-east1-b",
      keyRingId: "key-ring-2",
      cryptoKeyId: "crypto-key-3",
      versionId: "2",
    };
    const result = getGcpKmsResourcePath(options);
    expect(result).toBe(
      "projects/my-project-123/locations/us-east1-b/keyRings/key-ring-2/cryptoKeys/crypto-key-3/cryptoKeyVersions/2",
    );
  });
});
