import { Router, type IRouter } from "express";
import { db, membersTable, insertMemberSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/members", async (_req, res) => {
  const members = await db.select().from(membersTable).orderBy(membersTable.name);
  res.json(members);
});

router.post("/members", async (req, res) => {
  const parsed = insertMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [member] = await db.insert(membersTable).values(parsed.data).returning();
  res.status(201).json(member);
});

router.get("/members/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, id));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(member);
});

router.put("/members/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [member] = await db
    .update(membersTable)
    .set(parsed.data)
    .where(eq(membersTable.id, id))
    .returning();
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(member);
});

router.delete("/members/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(membersTable).where(eq(membersTable.id, id));
  res.status(204).send();
});

export default router;
