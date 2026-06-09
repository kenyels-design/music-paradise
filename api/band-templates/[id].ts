// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars não configuradas");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }, db: { schema: "louvorpro" } });
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

const FULL_SELECT = `
  *,
  band_template_members (
    id,
    member_id,
    role,
    sort_order,
    members ( id, name, role )
  )
`;

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { id } = req.query;
  const templateId = parseInt(id as string);

  if (!templateId || isNaN(templateId)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const supabase = getAdmin();

  // ── PATCH: update template fields ───────────────────────────────────────────
  if (req.method === "PATCH") {
    const { name, description, isActive, sortOrder } = req.body || {};

    const updates: Record<string, any> = {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Nome não pode ser vazio" });
      }
      updates.name = name.trim();
    }
    if (description !== undefined) updates.description = description?.trim() || null;
    if (isActive !== undefined) updates.is_active = Boolean(isActive);
    if (sortOrder !== undefined) updates.sort_order = Number(sortOrder);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" });
    }

    const { data: updated, error } = await supabase
      .from("band_templates")
      .update(updates)
      .eq("id", templateId)
      .select(FULL_SELECT)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!updated) return res.status(404).json({ error: "Template não encontrado" });

    return res.status(200).json(toClient(updated));
  }

  // ── DELETE: remove template (CASCADE removes members) ───────────────────────
  if (req.method === "DELETE") {
    const { error } = await supabase
      .from("band_templates")
      .delete()
      .eq("id", templateId);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Método não permitido" });
}
