// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars não configuradas");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }, db: { schema: "louvorpro" } });
}

function toClient(p: any) {
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    status: p.status,
    role: p.role ?? "musico",
    isAdmin: p.is_admin === true,
    createdAt: p.created_at,
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "PATCH") return res.status(405).json({ error: "Método não permitido" });

  const { id } = req.query;
  const { field, value } = req.body || {};

  if (!["name", "role", "status"].includes(field)) {
    return res.status(400).json({ error: "field inválido. Use: name, role ou status" });
  }

  const supabase = getAdmin();

  // Validate value per field
  if (field === "name") {
    if (!value || typeof value !== "string" || !value.trim()) {
      return res.status(400).json({ error: "Nome é obrigatório e não pode ser vazio" });
    }
  } else if (field === "role") {
    if (!["musico", "tecnica", "admin"].includes(value)) {
      return res.status(400).json({ error: "Role inválido. Use: musico, tecnica ou admin" });
    }
  } else if (field === "status") {
    if (!["pendente", "aprovado", "rejeitado"].includes(value)) {
      return res.status(400).json({ error: "Status inválido. Use: pendente, aprovado ou rejeitado" });
    }
  }

  const { data: current, error: fetchError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return res.status(404).json({ error: "Perfil não encontrado" });
  }

  // Build the patch payload
  let patch: Record<string, any>;

  if (field === "name") {
    patch = { name: value.trim() };
  } else if (field === "role") {
    patch = { role: value, is_admin: value === "admin" };
  } else {
    // field === "status"
    if (value === "aprovado") {
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("email", current.email)
        .maybeSingle();

      if (!existingMember) {
        const { error: insertError } = await supabase.from("members").insert({
          name: current.name,
          email: current.email,
          role: "A Definir",
          is_leader: false,
        });
        if (insertError) {
          return res.status(500).json({ error: `Não foi possível criar membro: ${insertError.message}` });
        }
      }
    }
    patch = { status: value };
  }

  const { data: updated, error: updateError } = await supabase
    .from("user_profiles")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (updateError || !updated) {
    return res.status(500).json({ error: updateError?.message ?? "Erro ao atualizar perfil" });
  }

  return res.status(200).json(toClient(updated));
}
