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
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  const { id } = req.query;
  const supabase = getAdmin();

  const { data, error } = await supabase.from("user_profiles").select("*").eq("id", id).single();
  if (error || !data) return res.status(404).json({ error: "Perfil não encontrado" });
  return res.status(200).json(toClient(data));
}
