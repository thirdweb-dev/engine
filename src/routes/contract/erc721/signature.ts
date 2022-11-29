import express, { Request, Response } from "express";
import { getSDK } from "../../../helpers/sdk";

const router = express.Router({ mergeParams: true });

router.post("/generate", async (req: Request, res: Response) => {
  const { chain_name, contract_address } = req.params;
  const { payload } = req.body;

  const sdk = await getSDK(chain_name);
  const contract = await sdk.getContract(contract_address);

  const signedPayload = await contract.erc721.signature.generate(payload);

  return res.json({
    result: {
      signedPayload,
    },
  });
});

export default router;
