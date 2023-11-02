import crypto from "crypto";
import { env } from "../env";

let clientId: string | undefined = undefined;

export const getClientId = () => {
  if (!clientId) {
    clientId = crypto
      .createHash("sha256")
      .update(env.THIRDWEB_API_SECRET_KEY)
      .digest("hex")
      .slice(0, 32);
  }

  return clientId;
};
