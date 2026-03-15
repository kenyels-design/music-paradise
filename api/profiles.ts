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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const supabase = getAdmin();

  if (req.method === "GET") {
    const { data, error } = await supabase.from("user_profiles").select("*").order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json((data || []).map(toClient));
  }

  if (req.method === "POST") {
    const { id, email, name } = req.body || {};
    if (!id || !email || !name) return res.status(400).json({ error: "id, email e name são obrigatórios" });

    const { data: existing } = await supabase.from("user_profiles").select("*").eq("id", id).single();
    if (existing) return res.status(200).json(toClient(existing));

    const { data, error } = await supabase.from("user_profiles")
      .insert({ id, email, name, status: "pendente", is_admin: false })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(toClient(data));
  }

  return res.status(405).json({ error: "Método não permitido" });
}
