/**
 * Split a GCP KMS resource path into its parts.
 */
export function splitGcpKmsResourcePath(resourcePath: string) {
  const parts = resourcePath.split("/");

  if (parts.length < 9) {
    throw new Error("Invalid GCP KMS resource path");
  }

  return {
    projectId: parts[1],
    locationId: parts[3],
    keyRingId: parts[5],
    cryptoKeyId: parts[7],
    versionId: parts[9],
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
