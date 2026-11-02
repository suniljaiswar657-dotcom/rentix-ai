import { getSql } from "./_lib/db.js";
import { methodNotAllowed, requireUser } from "./_lib/auth.js";

const validStatuses = new Set(["available", "occupied", "maintenance"]);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST", "PATCH"].includes(req.method)) return methodNotAllowed(res, ["GET", "POST", "PATCH"]);
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const sql = getSql();
    if (req.method === "GET") {
      const rows = await sql\`SELECT id, name, address, city, state, postal_code, unit_count,
        monthly_rent, occupancy_status, notes, created_at, updated_at
        FROM properties WHERE owner_id = \${user.id} ORDER BY created_at DESC\`;
      return res.status(200).json({ ok: true, properties: rows });
    }

    const body = req.body || {};
    if (req.method === "POST") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const address = typeof body.address === "string" ? body.address.trim() : "";
      const units = Number(body.unit_count ?? 1);
      const rent = Number(body.monthly_rent ?? 0);
      const status = body.occupancy_status ?? "available";
      if (!name || !address || name.length > 160 || address.length > 500 ||
          !Number.isInteger(units) || units < 1 || !Number.isFinite(rent) || rent < 0 ||
          !validStatuses.has(status)) return res.status(400).json({ ok: false, error: "Invalid property details" });
      const rows = await sql\`INSERT INTO properties
        (owner_id, name, address, city, state, postal_code, unit_count, monthly_rent, occupancy_status, notes)
        VALUES (\${user.id}, \${name}, \${address}, \${body.city || null}, \${body.state || null},
        \${body.postal_code || null}, \${units}, \${rent}, \${status}, \${body.notes || null}) RETURNING *\`;
      return res.status(201).json({ ok: true, property: rows[0] });
    }

    const id = typeof req.query.id === "string" ? req.query.id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
      return res.status(400).json({ ok: false, error: "A valid property id is required in ?id=" });
    const name = body.name === undefined ? null : (typeof body.name === "string" ? body.name.trim() : "");
    const address = body.address === undefined ? null : (typeof body.address === "string" ? body.address.trim() : "");
    const units = body.unit_count === undefined ? null : Number(body.unit_count);
    const rent = body.monthly_rent === undefined ? null : Number(body.monthly_rent);
    const status = body.occupancy_status === undefined ? null : body.occupancy_status;
    if ((name !== null && (!name || name.length > 160)) || (address !== null && (!address || address.length > 500)) ||
        (units !== null && (!Number.isInteger(units) || units < 1)) ||
        (rent !== null && (!Number.isFinite(rent) || rent < 0)) ||
        (status !== null && !validStatuses.has(status))) return res.status(400).json({ ok: false, error: "Invalid property details" });
    const rows = await sql\`UPDATE properties SET name = COALESCE(\${name}, name),
      address = COALESCE(\${address}, address), unit_count = COALESCE(\${units}, unit_count),
      monthly_rent = COALESCE(\${rent}, monthly_rent), occupancy_status = COALESCE(\${status}, occupancy_status),
      updated_at = NOW() WHERE id = \${id} AND owner_id = \${user.id} RETURNING *\`;
    if (!rows.length) return res.status(404).json({ ok: false, error: "Property not found" });
    return res.status(200).json({ ok: true, property: rows[0] });
  } catch (error) {
    console.error("Properties API failed:", error?.message || "unknown error");
    return res.status(500).json({ ok: false, error: "Unable to process properties request" });
  }
}
