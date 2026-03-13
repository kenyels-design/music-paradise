import { Router, type IRouter } from "express";
import { db, announcementsTable, insertAnnouncementSchema } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/announcements", async (_req, res) => {
  const announcements = await db
    .select()
    .from(announcementsTable)
    .orderBy(announcementsTable.isPinned, desc(announcementsTable.createdAt));
  res.json(announcements);
});

router.post("/announcements", async (req, res) => {
  const parsed = insertAnnouncementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [announcement] = await db.insert(announcementsTable).values(parsed.data).returning();
  res.status(201).json(announcement);
});

router.delete("/announcements/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.status(204).send();
});

export default router;
