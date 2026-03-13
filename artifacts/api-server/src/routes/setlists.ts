import { Router, type IRouter } from "express";
import {
  db,
  setlistItemsTable,
  insertSetlistItemSchema,
  songsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

const router: IRouter = Router();

router.get("/services/:id/setlist", async (req, res) => {
  const serviceId = Number(req.params.id);
  const items = await db
    .select()
    .from(setlistItemsTable)
    .leftJoin(songsTable, eq(setlistItemsTable.songId, songsTable.id))
    .where(eq(setlistItemsTable.serviceId, serviceId))
    .orderBy(setlistItemsTable.order);

  const result = items.map(({ setlist_items, songs }) => ({
    ...setlist_items,
    song: songs,
  }));
  res.json(result);
});

router.post("/services/:id/setlist", async (req, res) => {
  const serviceId = Number(req.params.id);
  const parsed = insertSetlistItemSchema.safeParse({ ...req.body, serviceId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [item] = await db.insert(setlistItemsTable).values(parsed.data).returning();
  const [song] = await db.select().from(songsTable).where(eq(songsTable.id, item.songId));
  res.status(201).json({ ...item, song });
});

const updateSetlistItemSchema = z.object({
  order: z.number().optional(),
  keyOverride: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

router.put("/services/:id/setlist/:itemId", async (req, res) => {
  const itemId = Number(req.params.itemId);
  const parsed = updateSetlistItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [item] = await db
    .update(setlistItemsTable)
    .set(parsed.data)
    .where(eq(setlistItemsTable.id, itemId))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Setlist item not found" });
    return;
  }
  const [song] = await db.select().from(songsTable).where(eq(songsTable.id, item.songId));
  res.status(200).json({ ...item, song });
});

router.delete("/services/:id/setlist/:itemId", async (req, res) => {
  const itemId = Number(req.params.itemId);
  await db.delete(setlistItemsTable).where(eq(setlistItemsTable.id, itemId));
  res.status(204).send();
});

export default router;
