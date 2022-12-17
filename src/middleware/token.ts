import { Request, Response, NextFunction } from "express";

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["authorization"];

  if (typeof header !== "undefined") {
    const bearer = header.split(" ");
    const token = bearer[1];

    if (token !== process.env.THIRDWEB_ADMIN_SECRET) {
      res.status(401).json({ message: "Unauthorized" });
    } else {
      next();
    }
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}
