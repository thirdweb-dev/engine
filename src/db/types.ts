import type { configuration, keypairs, permissions, tokens, webhooks } from "./schema";

export type ConfigInDb = typeof configuration.$inferSelect;

export type Permission = "ADMIN" | "OWNER";
export type PermissionDbEntry = typeof permissions.$inferSelect;
export type KeypairDbEntry = typeof keypairs.$inferSelect;

export type TokenDbEntry = typeof tokens.$inferSelect;

export type WebhookEventType = "AUTH" | "TRANSACTION";
export type WebhookDbEntry = typeof webhooks.$inferSelect;