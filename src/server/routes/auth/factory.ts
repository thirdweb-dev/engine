import { createFactory } from "hono/factory";
import type { AuthContext } from "../../middleware/auth/types.js";

export const authRoutesFactory = createFactory<AuthContext>();
