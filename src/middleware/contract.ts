import { Request, Response, NextFunction } from "express";
import { enforceSchema } from "../helpers/schema";
import { ContractParamsSchema } from "../schema/contract";

export async function verifyContract(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  enforceSchema({
    data: req.params,
    schema: ContractParamsSchema,
    error: `Invalid chain name or contract address in route`,
    next,
  });

  next();
}
