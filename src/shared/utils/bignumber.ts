/**
 * Utility functions for handling BigNumber objects in payloads
 */

/**
 * Interface representing a BigNumber object as it comes from the frontend
 */
interface BigNumberObject {
  type: "BigNumber";
  hex: string;
}

/**
 * Type guard to check if an object is a BigNumber object
 */
function isBigNumberObject(obj: unknown): obj is BigNumberObject {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    "hex" in obj &&
    obj.type === "BigNumber" &&
    typeof obj.hex === "string"
  );
}

/**
 * Converts a BigNumber object to a stringified bigint
 */
function bigNumberToStringifiedBigInt(bigNumberObj: BigNumberObject): string {
  // Convert hex string to bigint, then to string
  return BigInt(bigNumberObj.hex).toString();
}

/**
 * Recursively transforms all BigNumber objects in an arbitrary object/array
 * into stringified bigints
 */
export function transformBigNumbers(obj: unknown): unknown {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle BigNumber objects
  if (isBigNumberObject(obj)) {
    return bigNumberToStringifiedBigInt(obj);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(transformBigNumbers);
  }

  // Handle objects
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = transformBigNumbers(value);
    }
    return result;
  }

  // Handle primitives (string, number, boolean, etc.)
  return obj;
}