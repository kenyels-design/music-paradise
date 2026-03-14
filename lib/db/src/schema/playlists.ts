import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { servicesTable } from "./services";

export const playlistsTable = pgTable("playlists", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").references(() => servicesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  notes: text("notes"),
  spotifyUrl: text("spotify_url"),
  youtubeUrl: text("youtube_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlaylistSchema = createInsertSchema(playlistsTable).omit({ id: true, createdAt: true });
export type InsertPlaylist = z.infer<typeof insertPlaylistSchema>;
export type Playlist = typeof playlistsTable.$inferSelect;
