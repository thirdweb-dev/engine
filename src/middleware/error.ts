import { Request, Response, NextFunction } from "express";
import { ErrorSchema } from "../schema/error";

// All errors should be handled through this middleware
export default function handleError(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const parsed = ErrorSchema.safeParse(err);
  if (parsed.success) {
    return res.status(400).json({
      error: parsed.data,
    });
  }

  return res.status(500).json({
    error: {
      message: err.message,
      details: [],
    },
  });
}
