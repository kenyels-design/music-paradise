import { Router, type IRouter } from "express";
import { db, songsTable, insertSongSchema } from "@workspace/db";
import { eq, ilike, or, arrayContains } from "drizzle-orm";

const router: IRouter = Router();

router.get("/songs", async (req, res) => {
  const { tag, key, search } = req.query as { tag?: string; key?: string; search?: string };
  let query = db.select().from(songsTable).$dynamic();

  if (key) {
    query = query.where(eq(songsTable.key, key));
  }
  if (tag) {
    query = query.where(arrayContains(songsTable.tags, [tag]));
  }
  if (search) {
    query = query.where(
      or(
        ilike(songsTable.title, `%${search}%`),
        ilike(songsTable.artist, `%${search}%`)
      )
    );
  }

  const songs = await query.orderBy(songsTable.title);
  res.json(songs);
});

router.post("/songs", async (req, res) => {
  const parsed = insertSongSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [song] = await db.insert(songsTable).values(parsed.data).returning();
  res.status(201).json(song);
});

router.get("/songs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [song] = await db.select().from(songsTable).where(eq(songsTable.id, id));
  if (!song) {
    res.status(404).json({ error: "Song not found" });
    return;
  }
  res.json(song);
});

router.put("/songs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertSongSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [song] = await db
    .update(songsTable)
    .set(parsed.data)
    .where(eq(songsTable.id, id))
    .returning();
  if (!song) {
    res.status(404).json({ error: "Song not found" });
    return;
  }
  res.json(song);
});

router.delete("/songs/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(songsTable).where(eq(songsTable.id, id));
  res.status(204).send();
});

export default router;
