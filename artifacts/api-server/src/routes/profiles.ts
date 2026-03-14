import { Router, type IRouter } from "express";
import { supabaseAdmin, type UserStatus, type UserProfile } from "../lib/supabase";

const router: IRouter = Router();

function toClientProfile(p: UserProfile) {
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    status: p.status,
    isAdmin: String(p.is_admin),
    createdAt: p.created_at,
  };
}

router.get("/profiles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return res.status(404).json({ error: "Perfil não encontrado" });
    return res.json(toClientProfile(data as UserProfile));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/profiles", async (req, res) => {
  try {
    const { id, email, name } = req.body as { id: string; email: string; name: string };
    if (!id || !email || !name) {
      return res.status(400).json({ error: "id, email e name são obrigatórios" });
    }

    const { data: existing } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (existing) return res.json(toClientProfile(existing as UserProfile));

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .insert({ id, email, name, status: "pendente", is_admin: false })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(201).json(toClientProfile(data as UserProfile));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.patch("/profiles/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: UserStatus };

    if (!["pendente", "aprovado", "rejeitado"].includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: "Perfil não encontrado" });
    return res.json(toClientProfile(data as UserProfile));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/profiles", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase select error:", error);
      return res.status(500).json({ error: error.message });
    }
    return res.json((data as UserProfile[]).map(toClientProfile));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
