import { Hono } from "hono";
import { createAccessTokenRoute } from "./access-tokens.js";

const authRoutes = new Hono();

authRoutes.post("/access-tokens", ...createAccessTokenRoute);

export default authRoutes;
