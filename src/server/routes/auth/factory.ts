import { createFactory } from "hono/factory";
import type { AuthContext } from "../../middleware/auth/types";

export const authRoutesFactory = createFactory<AuthContext>();
