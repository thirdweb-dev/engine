import express from "express";
import erc721Router from "./erc721";
import { verifyContract } from "../../middleware/contract";

const router = express.Router({ mergeParams: true });

router.use(
  "/:chain_name/:contract_address/erc721",
  verifyContract,
  erc721Router
);

export default router;
