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

async function fetchTemplate(supabase: any, templateId: number) {
  const { data, error } = await supabase
    .from("band_templates")
    .select(FULL_SELECT)
    .eq("id", templateId)
    .single();
  return { data, error };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { id } = req.query;
  const templateId = parseInt(id as string);

  if (!templateId || isNaN(templateId)) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const supabase = getAdmin();

  // ── POST: add member to template ────────────────────────────────────────────
  if (req.method === "POST") {
    const { memberId, role } = req.body || {};

    if (!memberId || isNaN(Number(memberId))) {
      return res.status(400).json({ error: "memberId é obrigatório" });
    }

    const { data: existing } = await supabase
      .from("band_template_members")
      .select("sort_order")
      .eq("template_id", templateId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0;

    const { error: insertError } = await supabase
      .from("band_template_members")
      .insert({
        template_id: templateId,
        member_id: Number(memberId),
        role: role?.trim() || null,
        sort_order: nextSortOrder,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return res.status(409).json({ error: "Membro já está neste template" });
      }
      return res.status(500).json({ error: insertError.message });
    }

    const { data, error } = await fetchTemplate(supabase, templateId);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json(toClient(data));
  }

  // ── DELETE: remove member from template ─────────────────────────────────────
  if (req.method === "DELETE") {
    const { memberId } = req.body || {};

    if (!memberId || isNaN(Number(memberId))) {
      return res.status(400).json({ error: "memberId é obrigatório" });
    }

    const { error: deleteError } = await supabase
      .from("band_template_members")
      .delete()
      .eq("template_id", templateId)
      .eq("member_id", Number(memberId));

    if (deleteError) return res.status(500).json({ error: deleteError.message });

    const { data, error } = await fetchTemplate(supabase, templateId);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json(toClient(data));
  }

  return res.status(405).json({ error: "Método não permitido" });
}
