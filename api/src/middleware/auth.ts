import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization") || req.header("Authorization");
  if (!header) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization format" });
  }
  try {
    const secret = process.env.JWT_SECRET || "dev-secret";
    const payload = jwt.verify(token, secret) as {
      userId: string;
      agencyId: string;
      email: string;
      name?: string;
    };
    (req as any).user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
