// types.ts
import type { WebSocket } from "ws";

export interface UserSubscription {
  socket: WebSocket;
  requestId: string;
}

export const subscriptionsData: UserSubscription[] = [];
