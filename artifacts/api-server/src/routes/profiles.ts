import { Router, type IRouter } from "express";
import { db, userProfilesTable, insertUserProfileSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/profiles/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, id));
    if (!profile) return res.status(404).json({ error: "Perfil não encontrado" });
    return res.json(profile);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/profiles", async (req, res) => {
  try {
    const parsed = insertUserProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const existing = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, parsed.data.id));

    if (existing.length > 0) return res.json(existing[0]);

    const [profile] = await db
      .insert(userProfilesTable)
      .values({ ...parsed.data, status: "pendente" })
      .returning();
    return res.status(201).json(profile);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.patch("/profiles/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: "pendente" | "aprovado" | "rejeitado" };
    if (!["pendente", "aprovado", "rejeitado"].includes(status)) {
      return res.status(400).json({ error: "Status inválido" });
    }
    const [updated] = await db
      .update(userProfilesTable)
      .set({ status })
      .where(eq(userProfilesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Perfil não encontrado" });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/profiles", async (req, res) => {
  try {
    const profiles = await db.select().from(userProfilesTable).orderBy(userProfilesTable.createdAt);
    return res.json(profiles);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
