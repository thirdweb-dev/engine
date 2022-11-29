import express from "express";
import signatureRouter from "./signature";

const router = express.Router({ mergeParams: true });

router.use("/signature", signatureRouter);

export default router;
