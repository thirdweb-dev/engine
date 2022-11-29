import { NextFunction } from "express";

interface EnforceCallParams<T> {
  call: () => Promise<T>;
  error: string;
  next: NextFunction;
}

export async function enforceCall<T>({
  call,
  error,
  next,
}: EnforceCallParams<T>): Promise<T> {
  try {
    const result = await call();
    return result;
  } catch (err) {
    return next({
      message: error,
      details: [err.message],
    }) as T;
  }
}
