import express, { NextFunction, Request, Response } from "express";
import { enforceCall } from "../../../helpers/call";
import { getSDK } from "../../../helpers/sdk";

const router = express.Router({ mergeParams: true });

router.post(
  "/generate",
  async (req: Request, res: Response, next: NextFunction) => {
    const { chain_name, contract_address } = req.params;
    const { payload } = req.body;

    const sdk = await getSDK(chain_name);
    const contract = await sdk.getContract(contract_address);

    const signedPayload = await enforceCall({
      call: () => contract.erc721.signature.generate(payload),
      error: "Error generating payload",
      next,
    });

    return res.json({
      result: {
        signedPayload: signedPayload,
      },
    });
  }
);

export default router;
