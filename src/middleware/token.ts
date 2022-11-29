import { Request, Response, NextFunction } from "express";

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["authorization"];

  if (typeof header !== "undefined") {
    const bearer = header.split(" ");
    const token = bearer[1];

    if (token !== process.env.THIRDWEB_API_AUTH_TOKEN) {
      res.sendStatus(403);
    }
    next();
  } else {
    res.sendStatus(401);
  }
}
