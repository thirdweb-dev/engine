import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalWallet } from "@thirdweb-dev/wallets";
import type { FastifyRequest } from "fastify/types/request";
import jsonwebtoken from "jsonwebtoken";
import { getPermissions } from "../../src/shared/db/permissions/getPermissions";
import { WebhooksEventTypes } from "../../src/shared/schemas/webhooks";
import { onRequest } from "../../src/server/middleware/auth";
import {
  THIRDWEB_DASHBOARD_ISSUER,
  handleSiwe,
} from "../../src/shared/utils/auth";
import { getAccessToken } from "../../src/shared/utils/cache/accessToken";
import { getAuthWallet } from "../../src/shared/utils/cache/authWallet";
import { getConfig } from "../../src/shared/utils/cache/getConfig";
import { getWebhooksByEventType } from "../../src/shared/utils/cache/getWebhook";
import { getKeypair } from "../../src/shared/utils/cache/keypair";
import { sendWebhookRequest } from "../../src/shared/utils/webhook";
import { Permission } from "../../src/shared/schemas";

vi.mock("../utils/cache/accessToken");
const mockGetAccessToken = vi.mocked(getAccessToken);

vi.mock("../db/permissions/getPermissions");
const mockGetPermissions = vi.mocked(getPermissions);

vi.mock("../utils/cache/authWallet");
const mockGetAuthWallet = vi.mocked(getAuthWallet);

vi.mock("../utils/cache/getWebhook");
const mockGetWebhook = vi.mocked(getWebhooksByEventType);
mockGetWebhook.mockResolvedValue([]);

vi.mock("../utils/webhook");
const mockSendWebhookRequest = vi.mocked(sendWebhookRequest);

vi.mock("../utils/auth");
const mockHandleSiwe = vi.mocked(handleSiwe);

vi.mock("../utils/cache/keypair");
const mockGetKeypair = vi.mocked(getKeypair);

vi.mock("../utils/cache/getConfig");
const mockGetConfig = vi.mocked(getConfig);

let testAuthWallet: LocalWallet;
beforeAll(async () => {
  // Initialize a local auth wallet.
  testAuthWallet = new LocalWallet();
  await testAuthWallet.generate();
  mockGetAuthWallet.mockResolvedValue(testAuthWallet);

  const defaultConfig = await getConfig();

  mockGetConfig.mockResolvedValue({
    ...defaultConfig,
    accessControlAllowOrigin: "*",
    ipAllowlist: [],
  });
});

describe("Static paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGetUser = vi.fn();

  it("Static paths are authed", async () => {
    const pathsToTest = [
      "/",
      "/system/health",
      "/json",
      "/transaction/status/my-queue-id",
    ];
    for (const path of pathsToTest) {
      const req: FastifyRequest = {
        method: "GET",
        url: path,
        headers: {},
        // @ts-ignore
        raw: {},
      };

      const result = await onRequest({ req, getUser: mockGetUser });
      expect(result.isAuthed).toBeTruthy();
    }
  });
});

describe("Relayer endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGetUser = vi.fn();

  it("The 'relay transaction' endpoint is authed", async () => {
    const req: FastifyRequest = {
      method: "POST",
      url: "/relayer/be369f95-7bef-4e29-a016-3146fa394eb1",
      headers: {},
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeTruthy();
  });

  it("Other relayer endpoints are not authed", async () => {
    const pathsToTest = [
      "/relayer/getAll",
      "/relayer/create",
      "/relayer/revoke",
      "/relayer/update",
    ];
    for (const path of pathsToTest) {
      const req: FastifyRequest = {
        method: "POST",
        url: path,
        headers: {},
        // @ts-ignore
        raw: {},
      };

      const result = await onRequest({ req, getUser: mockGetUser });
      expect(result.isAuthed).toBeFalsy();
    }
  });
});

describe("Websocket requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGetUser = vi.fn();

  it("A websocket request with a valid access token is authed", async () => {
    mockGetAccessToken.mockResolvedValue({
      id: "my-access-token",
      tokenMask: "",
      walletAddress: "0x0000000000000000000000000123",
      createdAt: new Date(),
      expiresAt: new Date(),
      revokedAt: null,
      isAccessToken: true,
      label: "test access token",
    });

    mockGetUser.mockReturnValue({
      session: { permissions: Permission.Admin },
    });

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { upgrade: "WEBSOCKET" },
      query: { token: "my-access-token" },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeTruthy();
    expect(result.user).not.toBeUndefined();
  });

  it("A websocket request with a valid access token and non-admin permission is not authed", async () => {
    mockGetAccessToken.mockResolvedValue({
      id: "my-access-token",
      tokenMask: "",
      walletAddress: "0x0000000000000000000000000123",
      createdAt: new Date(),
      expiresAt: new Date(),
      revokedAt: null,
      isAccessToken: true,
      label: "test access token",
    });

    mockGetUser.mockReturnValue({ session: { permission: "none" } });

    const mockSocket = {
      write: vi.fn(),
      destroy: vi.fn(),
    };

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { upgrade: "WEBSOCKET" },
      query: { token: "my-access-token" },
      // @ts-ignore
      raw: { socket: mockSocket },
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
    expect(mockSocket.write).toHaveBeenCalledTimes(1);
    expect(mockSocket.destroy).toHaveBeenCalledTimes(1);
  });

  it("A websocket request with a revoked access token is not authed", async () => {
    mockGetAccessToken.mockResolvedValue({
      id: "my-access-token",
      tokenMask: "",
      walletAddress: "0x0000000000000000000000000123",
      createdAt: new Date(),
      expiresAt: new Date(),
      revokedAt: new Date(),
      isAccessToken: true,
      label: "test access token",
    });

    mockGetUser.mockReturnValue({
      session: {
        permission: Permission.Admin,
      },
    });

    const mockSocket = {
      write: vi.fn(),
      destroy: vi.fn(),
    };

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { upgrade: "WEBSOCKET" },
      query: { token: "my-access-token" },
      // @ts-ignore
      raw: { socket: mockSocket },
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
    expect(mockSocket.write).toHaveBeenCalledTimes(1);
    expect(mockSocket.destroy).toHaveBeenCalledTimes(1);
  });

  it("A websocket request with an invalid access token is not authed", async () => {
    mockGetAccessToken.mockResolvedValue(null);

    const mockSocket = {
      write: vi.fn(),
      destroy: vi.fn(),
    };

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { upgrade: "WEBSOCKET" },
      query: { token: "my-access-token" },
      // @ts-ignore
      raw: { socket: mockSocket },
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
    expect(mockSocket.write).toHaveBeenCalledTimes(1);
    expect(mockSocket.destroy).toHaveBeenCalledTimes(1);
  });

  it("A websocket request with IP outside of IP Allowlist is not authed", async () => {
    mockGetAccessToken.mockResolvedValue({
      id: "my-access-token",
      tokenMask: "",
      walletAddress: "0x0000000000000000000000000123",
      createdAt: new Date(),
      expiresAt: new Date(),
      revokedAt: null,
      isAccessToken: true,
      label: "test access token",
    });

    mockGetUser.mockReturnValue({
      session: { permissions: Permission.Admin },
    });

    const mockSocket = {
      write: vi.fn(),
      destroy: vi.fn(),
    };

    const defaultConfig = await getConfig();
    mockGetConfig.mockResolvedValueOnce({
      ...defaultConfig,
      accessControlAllowOrigin: "*",
      ipAllowlist: ["123.123.1.1"],
    });

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { upgrade: "WEBSOCKET" },
      query: { token: "my-access-token" },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
    expect(result.user).toBeUndefined();
    expect(result.error).toEqual(
      "Unauthorized IP Address. See: https://portal.thirdweb.com/engine/features/security",
    );
  });
});

describe("Access tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGetUser = vi.fn();

  it("Valid access token with admin permissions is authed", async () => {
    const jwt = jsonwebtoken.sign(
      { iss: await testAuthWallet.getAddress() },
      "test",
    );
    mockGetAccessToken.mockResolvedValue({
      id: "my-access-token",
      tokenMask: "",
      walletAddress: "0x0000000000000000000000000123",
      createdAt: new Date(),
      expiresAt: new Date(),
      revokedAt: null,
      isAccessToken: true,
      label: "test access token",
    });

    mockGetUser.mockReturnValue({
      session: { permissions: Permission.Admin },
    });

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeTruthy();
    expect(result.user).not.toBeUndefined();
  });

  it("Valid access token with non-admin permissions is not authed", async () => {
    const jwt = jsonwebtoken.sign(
      { iss: await testAuthWallet.getAddress() },
      "test",
    );
    mockGetAccessToken.mockResolvedValue({
      id: "my-access-token",
      tokenMask: "",
      walletAddress: "0x0000000000000000000000000123",
      createdAt: new Date(),
      expiresAt: new Date(),
      revokedAt: null,
      isAccessToken: true,
      label: "test access token",
    });

    mockGetUser.mockReturnValue({
      session: { permissions: "none" },
    });

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
  });

  it("Revoked access token is not authed", async () => {
    const jwt = jsonwebtoken.sign(
      { iss: await testAuthWallet.getAddress() },
      "test",
    );
    mockGetAccessToken.mockResolvedValue({
      id: "my-access-token",
      tokenMask: "",
      walletAddress: "0x0000000000000000000000000123",
      createdAt: new Date(),
      expiresAt: new Date(),
      revokedAt: new Date(),
      isAccessToken: true,
      label: "test access token",
    });

    mockGetUser.mockReturnValue({
      session: { permissions: Permission.Admin },
    });

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
  });

  it("Invalid access token is not authed", async () => {
    const jwt = jsonwebtoken.sign(
      { iss: await testAuthWallet.getAddress() },
      "test",
    );
    mockGetAccessToken.mockResolvedValue(null);

    mockGetUser.mockReturnValue({
      session: { permissions: Permission.Admin },
    });

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
  });

  it("Request from IP outside allowlist is not authed", async () => {
    const jwt = jsonwebtoken.sign(
      { iss: await testAuthWallet.getAddress() },
      "test",
    );

    const defaultConfig = await getConfig();
    mockGetConfig.mockResolvedValueOnce({
      ...defaultConfig,
      accessControlAllowOrigin: "*",
      ipAllowlist: ["123.123.1.1"],
    });

    mockGetAccessToken.mockResolvedValue({
      id: "my-access-token",
      tokenMask: "",
      walletAddress: "0x0000000000000000000000000123",
      createdAt: new Date(),
      expiresAt: new Date(),
      revokedAt: null,
      isAccessToken: true,
      label: "test access token",
    });

    mockGetUser.mockReturnValue({
      session: { permissions: Permission.Admin },
    });

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
    expect(result.user).toBeUndefined();
    expect(result.error).toEqual(
      "Unauthorized IP Address. See: https://portal.thirdweb.com/engine/features/security",
    );
  });
});

describe("Keypair auth JWT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Example ES256 keypair used only for unit tests.
  const testKeypair = {
    public: `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEKbqftPicYL3V+4gZHi16wUWSJ1gO
bsSyKJ/JW3qPUmL0fhdSNZz6C0cP9UNh7FQsLQ/l2BcOH8+G2xvh+8tjtQ==
-----END PUBLIC KEY-----`,
    private: `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEICIJbkRowq93OJvo2Tk4eopRbU8dDqp1bh9xHDpF9b6boAoGCCqGSM49
AwEHoUQDQgAEKbqftPicYL3V+4gZHi16wUWSJ1gObsSyKJ/JW3qPUmL0fhdSNZz6
C0cP9UNh7FQsLQ/l2BcOH8+G2xvh+8tjtQ==
-----END EC PRIVATE KEY-----`,
  } as const;

  const mockGetUser = vi.fn();

  it("Valid JWT signed by private key", async () => {
    mockGetKeypair.mockResolvedValue({
      hash: "",
      publicKey: testKeypair.public,
      algorithm: "ES256",
      label: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Sign a valid auth payload.
    const jwt = jsonwebtoken.sign(
      { iss: testKeypair.public },
      testKeypair.private,
      {
        algorithm: "ES256",
        expiresIn: "20s",
      },
    );

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeTruthy();
    expect(result.user).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it("Expired JWT signed by private key", async () => {
    mockGetKeypair.mockResolvedValue({
      hash: "",
      publicKey: testKeypair.public,
      algorithm: "ES256",
      label: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Sign an expired auth payload.
    const jwt = jsonwebtoken.sign(
      { iss: testKeypair.public },
      testKeypair.private,
      {
        algorithm: "ES256",
        expiresIn: -3_000,
      },
    );

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
    expect(result.user).toBeUndefined();
    expect(result.error).toEqual("Keypair token is expired.");
  });

  it("Unrecognized public key", async () => {
    // Get keypair returns null for an unrecognized public key
    mockGetKeypair.mockResolvedValueOnce(null);

    // Sign an expired auth payload.
    const jwt = jsonwebtoken.sign(
      { iss: "some_other_public_key" },
      testKeypair.private,
      {
        algorithm: "ES256",
        expiresIn: "15s",
      },
    );

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
    expect(result.user).toBeUndefined();
    expect(result.error).toEqual(
      "The provided public key is incorrect or not added to Engine.",
    );
  });

  it("Invalid JWT signed by the wrong private key", async () => {
    // Sign a valid auth payload with a different private key.
    const WRONG_PRIVATE_KEY = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIH719lhdn4CzboBQKr8E68htVNeQ2wwrxnsDhfLOgGNAoAoGCCqGSM49
AwEHoUQDQgAE74w9+HXi/PCQZTu2AS4titehOFopNSrfqlFnFbtglPuwNB2ke53p
6sE9ABLmMjeNbKKz9ayyCGN/BC3MNikhfw==
-----END EC PRIVATE KEY-----`;
    const jwt = jsonwebtoken.sign(
      { iss: testKeypair.public },
      WRONG_PRIVATE_KEY,
      {
        algorithm: "ES256",
        expiresIn: "15s",
      },
    );

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
    expect(result.user).toBeUndefined();
    expect(result.error).toEqual(
      'Error parsing "Authorization" header. See: https://portal.thirdweb.com/engine/features/access-tokens',
    );
  });

  it("IP outside of IP Allowlist", async () => {
    const defaultConfig = await getConfig();
    mockGetConfig.mockResolvedValueOnce({
      ...defaultConfig,
      accessControlAllowOrigin: "*",
      ipAllowlist: ["123.123.1.1"],
    });

    mockGetKeypair.mockResolvedValue({
      hash: "",
      publicKey: testKeypair.public,
      algorithm: "ES256",
      label: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Sign a valid auth payload.
    const jwt = jsonwebtoken.sign(
      { iss: testKeypair.public },
      testKeypair.private,
      {
        algorithm: "ES256",
        expiresIn: "20s",
      },
    );

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
    expect(result.error).toEqual(
      "Unauthorized IP Address. See: https://portal.thirdweb.com/engine/features/security",
    );
    expect(result.user).toBeUndefined();
  });
});

describe("Dashboard JWT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGetUser = vi.fn();
  mockGetAccessToken.mockResolvedValue(null);

  it("Valid dashboard JWT with admin permission is authed", async () => {
    const jwt = jsonwebtoken.sign({ iss: THIRDWEB_DASHBOARD_ISSUER }, "test");
    mockHandleSiwe.mockResolvedValue({
      address: "0x0000000000000000000000000123",
    });
    mockGetPermissions.mockResolvedValue({
      walletAddress: "0x0000000000000000000000000123",
      permissions: Permission.Admin,
      label: null,
    });

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeTruthy();
    expect(result.user).not.toBeUndefined();
  });

  it("Request with valid dashboard JWT but IP outside allowlist is still authed", async () => {
    const jwt = jsonwebtoken.sign({ iss: THIRDWEB_DASHBOARD_ISSUER }, "test");
    mockHandleSiwe.mockResolvedValue({
      address: "0x0000000000000000000000000123",
    });
    mockGetPermissions.mockResolvedValue({
      walletAddress: "0x0000000000000000000000000123",
      permissions: Permission.Admin,
      label: null,
    });

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const defaultConfig = await getConfig();

    mockGetConfig.mockResolvedValueOnce({
      ...defaultConfig,
      accessControlAllowOrigin: "*",
      ipAllowlist: ["123.123.1.1"],
    });

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeTruthy();
    expect(result.user).not.toBeUndefined();
  });

  it("Valid dashboard JWT with non-admin permission is not authed", async () => {
    // Mock dashboard JWTs.
    const jwt = jsonwebtoken.sign({ iss: THIRDWEB_DASHBOARD_ISSUER }, "test");
    mockHandleSiwe.mockResolvedValue({
      address: "0x0000000000000000000000000123",
    });
    mockGetPermissions.mockResolvedValue({
      walletAddress: "0x0000000000000000000000000123",
      permissions: "none",
      label: null,
    });

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
  });

  it("Dashboard JWT for an unknown user is not authed", async () => {
    // Mock dashboard JWTs.
    const jwt = jsonwebtoken.sign({ iss: THIRDWEB_DASHBOARD_ISSUER }, "test");
    mockHandleSiwe.mockResolvedValue({
      address: "0x0000000000000000000000000123",
    });
    mockGetPermissions.mockResolvedValue(null);

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
  });

  it("Invalid dashboard JWT is not authed", async () => {
    // Mock dashboard JWTs.
    const jwt = jsonwebtoken.sign({ iss: THIRDWEB_DASHBOARD_ISSUER }, "test");
    mockHandleSiwe.mockResolvedValue(null);

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: `Bearer ${jwt}` },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
  });
});

describe("thirdweb secret key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGetUser = vi.fn();

  it("Valid thirdweb secret key is authed", async () => {
    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: "Bearer my-thirdweb-secret-key" },
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeTruthy();
    expect(result.user).not.toBeUndefined();
  });

  it("Request with valid thirdweb secret key but IP outside allowlist is still authed", async () => {
    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: { authorization: "Bearer my-thirdweb-secret-key" },
      // @ts-ignore
      raw: {},
    };

    const defaultConfig = await getConfig();

    mockGetConfig.mockResolvedValueOnce({
      ...defaultConfig,
      accessControlAllowOrigin: "*",
      ipAllowlist: ["123.123.1.1"],
    });

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeTruthy();
    expect(result.user).not.toBeUndefined();
  });
});

describe("auth webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGetUser = vi.fn();

  it("A request that gets a 2xx from all auth webhooks is authed", async () => {
    mockGetWebhook.mockResolvedValue([
      {
        id: 1,
        url: "test-webhook-url",
        name: "auth webhook 1",
        eventType: WebhooksEventTypes.AUTH,
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
        secret: "random-secret",
      },
      {
        id: 2,
        url: "test-webhook-url",
        name: "auth webhook 2",
        eventType: WebhooksEventTypes.AUTH,
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
        secret: "random-secret-2",
      },
    ]);

    // Both auth webhooks return 2xx.
    mockSendWebhookRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: "test-1",
    });
    mockSendWebhookRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: "test-2",
    });

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: {},
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeTruthy();
    expect(result.user).toBeUndefined();
  });

  it("A request that gets a non-2xx from any auth webhooks is not authed", async () => {
    mockGetWebhook.mockResolvedValue([
      {
        id: 1,
        url: "test-webhook-url",
        name: "auth webhook 1",
        eventType: WebhooksEventTypes.AUTH,
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
        secret: "random-secret",
      },
      {
        id: 1,
        url: "test-webhook-url",
        name: "auth webhook 1",
        eventType: WebhooksEventTypes.AUTH,
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
        secret: "random-secret",
      },
    ]);

    // Both auth webhooks return 4xx.
    mockSendWebhookRequest.mockResolvedValueOnce({
      ok: false,
      status: 400,
      body: "error-1",
    });
    mockSendWebhookRequest.mockResolvedValueOnce({
      ok: false,
      status: 401,
      body: "error-2",
    });

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: {},
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
  });

  it("A request with no auth webhooks is not authed", async () => {
    mockGetWebhook.mockResolvedValue([]);

    const req: FastifyRequest = {
      method: "POST",
      url: "/backend-wallets/get-all",
      headers: {},
      // @ts-ignore
      raw: {},
    };

    const result = await onRequest({ req, getUser: mockGetUser });
    expect(result.isAuthed).toBeFalsy();
  });
});
