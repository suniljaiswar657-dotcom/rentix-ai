import { createRemoteJWKSet, jwtVerify } from "jose";
import { getSql } from "./db.js";

let jwks;
function authConfig() {
  const base = process.env.NEON_AUTH_URL;
  if (!base) throw new Error("NEON_AUTH_URL is not configured");
  const normalized = base.replace(/\/+$/, "");
  return { issuer: new URL(normalized).origin, jwksUrl: new URL(normalized + "/.well-known/jwks.json") };
}

export async function requireUser(req, res) {
  const header = req.headers.authorization || "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    res.status(401).json({ ok: false, error: "Authentication required" });
    return null;
  }
  try {
    const config = authConfig();
    if (!jwks) jwks = createRemoteJWKSet(config.jwksUrl);
    const { payload } = await jwtVerify(header.slice(7).trim(), jwks, { issuer: config.issuer });
    if (!payload.sub || typeof payload.email !== "string" || !payload.email.trim()) {
      res.status(401).json({ ok: false, error: "Invalid authentication token" });
      return null;
    }
    const email = payload.email.trim().toLowerCase();
    const fullName = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email.split("@")[0];
    const sql = getSql();
    const rows = await sql\`INSERT INTO app_users (auth_subject, email, full_name)
      VALUES (\${payload.sub}, \${email}, \${fullName})
      ON CONFLICT (auth_subject) DO UPDATE SET email = EXCLUDED.email,
      full_name = CASE WHEN app_users.full_name = '' THEN EXCLUDED.full_name ELSE app_users.full_name END,
      updated_at = NOW() RETURNING id, auth_subject, email, full_name\`;
    return rows[0];
  } catch (error) {
    console.error("Authentication verification failed:", error?.message || "unknown error");
    res.status(401).json({ ok: false, error: "Invalid or expired session" });
    return null;
  }
}

export function methodNotAllowed(res, allowed) {
  res.setHeader("Allow", allowed.join(", "));
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
