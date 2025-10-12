import jwt from "jsonwebtoken";
export function requireAuth(req, res, next) {
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
        const payload = jwt.verify(token, secret);
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
