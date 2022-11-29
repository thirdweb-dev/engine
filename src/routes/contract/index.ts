import express from "express";
import erc721Router from "./erc721";

const router = express.Router({ mergeParams: true });

router.use("/:chain_name/:contract_address/erc721", erc721Router);

export default router;
