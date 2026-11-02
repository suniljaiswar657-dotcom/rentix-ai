import { getSql } from "./_lib/db.js";
import { methodNotAllowed, requireUser } from "./_lib/auth.js";

const validStatuses = new Set(["active", "ended", "pending"]);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST", "PATCH"].includes(req.method)) return methodNotAllowed(res, ["GET", "POST", "PATCH"]);
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const sql = getSql();
    if (req.method === "GET") {
      const rows = await sql\`SELECT t.id, t.property_id, t.full_name, t.email, t.phone,
        t.lease_start, t.lease_end, t.lease_status, t.monthly_rent, t.created_at, t.updated_at,
        p.name AS property_name FROM tenants t
        LEFT JOIN properties p ON p.id = t.property_id AND p.owner_id = t.owner_id
        WHERE t.owner_id = \${user.id} ORDER BY t.created_at DESC\`;
      return res.status(200).json({ ok: true, tenants: rows });
    }

    const body = req.body || {};
    if (req.method === "POST") {
      const name = typeof body.full_name === "string" ? body.full_name.trim() : "";
      const propertyId = body.property_id || null;
      const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
      const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
      const rent = Number(body.monthly_rent ?? 0);
      const status = body.lease_status ?? "active";
      if (!name || name.length > 160 || !Number.isFinite(rent) || rent < 0 || !validStatuses.has(status))
        return res.status(400).json({ ok: false, error: "Invalid tenant details" });

      let rows;
      if (propertyId) {
        rows = await sql\`INSERT INTO tenants
          (owner_id, property_id, full_name, email, phone, lease_start, lease_end, lease_status, monthly_rent)
          SELECT \${user.id}, p.id, \${name}, \${email}, \${phone}, \${body.lease_start || null},
          \${body.lease_end || null}, \${status}, \${rent}
          FROM properties p WHERE p.id = \${propertyId} AND p.owner_id = \${user.id} RETURNING *\`;
      } else {
        rows = await sql\`INSERT INTO tenants
          (owner_id, property_id, full_name, email, phone, lease_start, lease_end, lease_status, monthly_rent)
          VALUES (\${user.id}, NULL, \${name}, \${email}, \${phone}, \${body.lease_start || null},
          \${body.lease_end || null}, \${status}, \${rent}) RETURNING *\`;
      }
      if (!rows.length) return res.status(400).json({ ok: false, error: "Property not found in your account" });
      return res.status(201).json({ ok: true, tenant: rows[0] });
    }

    const id = typeof req.query.id === "string" ? req.query.id : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
      return res.status(400).json({ ok: false, error: "A valid tenant id is required in ?id=" });
    const name = body.full_name === undefined ? null : (typeof body.full_name === "string" ? body.full_name.trim() : "");
    const email = body.email === undefined ? null : (typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : "");
    const phone = body.phone === undefined ? null : (typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : "");
    const rent = body.monthly_rent === undefined ? null : Number(body.monthly_rent);
    const status = body.lease_status === undefined ? null : body.lease_status;
    if ((name !== null && (!name || name.length > 160)) || (rent !== null && (!Number.isFinite(rent) || rent < 0)) ||
        (status !== null && !validStatuses.has(status)))
      return res.status(400).json({ ok: false, error: "Invalid tenant details" });
    const rows = await sql\`UPDATE tenants SET
      full_name = COALESCE(\${name}, full_name),
      email = CASE WHEN \${email} IS NULL THEN email ELSE NULLIF(\${email}, '') END,
      phone = CASE WHEN \${phone} IS NULL THEN phone ELSE NULLIF(\${phone}, '') END,
      monthly_rent = COALESCE(\${rent}, monthly_rent),
      lease_status = COALESCE(\${status}, lease_status),
      updated_at = NOW()
      WHERE id = \${id} AND owner_id = \${user.id} RETURNING *\`;
    if (!rows.length) return res.status(404).json({ ok: false, error: "Tenant not found" });
    return res.status(200).json({ ok: true, tenant: rows[0] });
  } catch (error) {
    console.error("Tenants API failed:", error?.message || "unknown error");
    return res.status(500).json({ ok: false, error: "Unable to process tenants request" });
  }
}
