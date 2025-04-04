import { Hono } from "hono";
import { writeToContractRoute } from "./write.js";
import { thirdwebClientMiddleware } from "../../middleware/thirdweb-client.js";

const contractRoutes = new Hono();

contractRoutes.use(thirdwebClientMiddleware);
contractRoutes.post("/write", ...writeToContractRoute);

export default contractRoutes;
