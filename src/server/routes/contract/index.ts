import { Hono } from "hono";
import { writeToContractRoute } from "./write";
import { thirdwebClientMiddleware } from "../../middleware/thirdweb-client";

const contractRoutes = new Hono();

contractRoutes.use(thirdwebClientMiddleware);
contractRoutes.post("/write", ...writeToContractRoute);

export default contractRoutes;
