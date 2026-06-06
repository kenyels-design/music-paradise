// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars não configuradas");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function toClient(t: any) {
  return {
    id: t.id,
    name: t.name,
    type: t.type,
    description: t.description ?? null,
    sortOrder: t.sort_order,
    isActive: t.is_active,
    createdAt: t.created_at,
    members: (t.band_template_members ?? []).map((m: any) => ({
      id: m.id,
      memberId: m.member_id,
      memberName: m.members?.name ?? "",
      memberDefaultRole: m.members?.role ?? "",
      role: m.role ?? null,
      sortOrder: m.sort_order,
    })),
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const supabase = getAdmin();

  // ── GET: list all templates with members ────────────────────────────────────
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("band_templates")
      .select(`
        *,
        band_template_members (
          id,
          member_id,
          role,
          sort_order,
          members ( id, name, role )
        )
      `)
      .order("sort_order", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json((data ?? []).map(toClient));
  }

  // ── POST: create template ───────────────────────────────────────────────────
  if (req.method === "POST") {
    const { name, type, description } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const validTypes = ["weekend", "thursday", "other"];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: "Tipo inválido. Use: weekend, thursday ou other" });
    }

    const { data: existing } = await supabase
      .from("band_templates")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0;

    const { data: created, error } = await supabase
      .from("band_templates")
      .insert({
        name: name.trim(),
        type: type ?? "weekend",
        description: description?.trim() || null,
        sort_order: nextSortOrder,
        is_active: true,
      })
      .select(`
        *,
        band_template_members (
          id,
          member_id,
          role,
          sort_order,
          members ( id, name, role )
        )
      `)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json(toClient(created));
  }

  return res.status(405).json({ error: "Método não permitido" });
}
