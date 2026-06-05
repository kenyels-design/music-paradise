// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars não configuradas");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
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
  const { name } = req.body || {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Nome é obrigatório e não pode ser vazio" });
  }

  const supabase = getAdmin();

  const { data: current, error: fetchError } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return res.status(404).json({ error: "Perfil não encontrado" });
  }

  const { data: updated, error: updateError } = await supabase
    .from("user_profiles")
    .update({ name: name.trim() })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return res.status(500).json({ error: updateError.message ?? "Erro ao atualizar nome" });
  }

  if (!updated) {
    return res.status(404).json({ error: "Perfil não encontrado após update" });
  }

  return res.status(200).json(toClient(updated));
}
