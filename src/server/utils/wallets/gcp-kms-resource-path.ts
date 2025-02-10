/**
 * Split a GCP KMS resource path into its parts.
 */
export function splitGcpKmsResourcePath(resourcePath: string) {
  const parts = resourcePath.split("/");

  if (parts.length < 9) {
    throw new Error("Invalid GCP KMS resource path");
  }

  const projectId = parts[1];
  const locationId = parts[3];
  const keyRingId = parts[5];
  const cryptoKeyId = parts[7];
  const versionId = parts[9];

  if (!projectId || !locationId || !keyRingId || !cryptoKeyId || !versionId) {
    throw new Error("Invalid GCP KMS resource path");
  }

  return {
    projectId,
    locationId,
    keyRingId,
    cryptoKeyId,
    versionId,
  };
}

/**
 *  Get a GCP KMS resource path from its parts.
 */
export function getGcpKmsResourcePath(options: {
  locationId: string;
  keyRingId: string;
  cryptoKeyId: string;
  versionId: string;
  projectId: string;
}) {
  return `projects/${options.projectId}/locations/${options.locationId}/keyRings/${options.keyRingId}/cryptoKeys/${options.cryptoKeyId}/cryptoKeyVersions/${options.versionId}`;
}
