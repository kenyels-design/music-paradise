// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars não configuradas");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function toClient(p: any) {
  return { id: p.id, email: p.email, name: p.name, status: p.status, isAdmin: p.is_admin === true, createdAt: p.created_at };
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "PATCH") return res.status(405).json({ error: "Método não permitido" });

  const { id } = req.query;
  const { status } = req.body || {};

  if (!["pendente", "aprovado", "rejeitado"].includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }

  const supabase = getAdmin();

  const { data: current, error: fetchError } = await supabase
    .from("user_profiles").select("*").eq("id", id).single();
  if (fetchError || !current) return res.status(404).json({ error: "Perfil não encontrado" });

  if (status === "aprovado") {
    const { data: existingMember } = await supabase
      .from("members").select("id").eq("email", current.email).maybeSingle();

    if (!existingMember) {
      const { error: insertError } = await supabase.from("members").insert({
        name: current.name, email: current.email, role: "A Definir", is_leader: false,
      });
      if (insertError) return res.status(500).json({ error: `Não foi possível criar membro: ${insertError.message}` });
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("user_profiles").update({ status }).eq("id", id).select().single();
  if (updateError || !updated) return res.status(500).json({ error: "Erro ao atualizar status" });

  return res.status(200).json(toClient(updated));
}
