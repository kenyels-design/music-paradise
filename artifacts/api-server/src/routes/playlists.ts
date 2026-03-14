import { Router, type IRouter } from "express";
import { db, playlistsTable, insertPlaylistSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// List playlists for a service
router.get("/services/:id/playlists", async (req, res) => {
  const serviceId = Number(req.params.id);
  const playlists = await db
    .select()
    .from(playlistsTable)
    .where(eq(playlistsTable.serviceId, serviceId))
    .orderBy(playlistsTable.createdAt);
  res.json(playlists);
});

// Create playlist for a service
router.post("/services/:id/playlists", async (req, res) => {
  const serviceId = Number(req.params.id);
  const parsed = insertPlaylistSchema.safeParse({ ...req.body, serviceId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [playlist] = await db.insert(playlistsTable).values(parsed.data).returning();
  res.status(201).json(playlist);
});

// Update a playlist
router.put("/playlists/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertPlaylistSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [playlist] = await db
    .update(playlistsTable)
    .set(parsed.data)
    .where(eq(playlistsTable.id, id))
    .returning();
  if (!playlist) {
    res.status(404).json({ error: "Playlist not found" });
    return;
  }
  res.json(playlist);
});

// Delete a playlist
router.delete("/playlists/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(playlistsTable).where(eq(playlistsTable.id, id));
  res.status(204).send();
});

export default router;
