import { describe, expect, it } from "vitest";
import {
  getAwsKmsArn,
  splitAwsKmsArn,
} from "../../src/server/utils/wallets/aws-kms-arn";

describe("splitAwsKmsArn", () => {
  it("should correctly split a valid AWS KMS ARN", () => {
    const arn =
      "arn:aws:kms:us-west-2:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab";
    const result = splitAwsKmsArn(arn);
    expect(result).toEqual({
      region: "us-west-2",
      accountId: "123456789012",
      keyId: "1234abcd-12ab-34cd-56ef-1234567890ab",
    });
  });

  it("should throw an error for an ARN without a key ID", () => {
    const arn = "arn:aws:kms:us-west-2:123456789012:key/";
    expect(() => splitAwsKmsArn(arn)).toThrow("Invalid AWS KMS ARN");
  });

  it("should throw an error for an ARN with insufficient parts", () => {
    const arn = "arn:aws:kms:us-west-2:123456789012";
    expect(() => splitAwsKmsArn(arn)).toThrow("Invalid AWS KMS ARN");
  });

  it("should handle ARNs with additional parts", () => {
    const arn = "arn:aws:kms:us-west-2:123456789012:key/abcdef:extra:parts";
    const result = splitAwsKmsArn(arn);
    expect(result).toEqual({
      region: "us-west-2",
      accountId: "123456789012",
      keyId: "abcdef:extra:parts",
    });
  });
});

describe("getAwsKmsArn", () => {
  it("should correctly construct an AWS KMS ARN", () => {
    const options = {
      region: "eu-central-1",
      accountId: "987654321098",
      keyId: "9876fedc-ba98-7654-3210-fedcba9876543",
    };
    const result = getAwsKmsArn(options);
    expect(result).toBe(
      "arn:aws:kms:eu-central-1:987654321098:key/9876fedc-ba98-7654-3210-fedcba9876543",
    );
  });

  it("should handle numeric account IDs", () => {
    const options = {
      region: "us-east-1",
      accountId: "123456789012",
      keyId: "abcdef",
    };
    const result = getAwsKmsArn(options);
    expect(result).toBe("arn:aws:kms:us-east-1:123456789012:key/abcdef");
  });
});
