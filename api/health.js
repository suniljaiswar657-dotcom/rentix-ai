import { getSql } from "./_lib/db.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({
      ok: false,
      service: "rentix-ai-api",
      database: "not_configured"
    });
  }

  try {
    const sql = getSql();
    await sql`SELECT 1 AS connected`;

    return res.status(200).json({
      ok: true,
      service: "rentix-ai-api",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch {
    return res.status(503).json({
      ok: false,
      service: "rentix-ai-api",
      database: "unavailable"
    });
  }
}
