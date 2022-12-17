import { isAddress } from "@ethersproject/address";
import express, { NextFunction, Request, Response } from "express";
import { enforceCall } from "../../../helpers/call";
import { getSDK } from "../../../helpers/sdk";

const router = express.Router({ mergeParams: true });

async function validateAddressAndResolveENS(
  address: string
): Promise<null | string> {
  const provider = (await getSDK("ethereum")).getProvider();

  if (!provider) {
    return address;
  }

  if (isAddress(address)) {
    return address;
  }

  return await provider.resolveName(address);
}

router.post(
  "/generate",
  async (req: Request, res: Response, next: NextFunction) => {
    const { chain_name, contract_address } = req.params;
    const { payload } = req.body;

    if (!payload || !payload.to) {
      return res.status(400).json({ error: { message: "Invalid payload" } });
    }

    try {
      payload.to = await validateAddressAndResolveENS(payload.to);

      const sdk = await getSDK(chain_name);
      const contract = await sdk.getContract(contract_address);
      const signedPayload = await contract.erc721.signature.generate(payload);

      return res.json({
        result: {
          signedPayload: signedPayload,
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
