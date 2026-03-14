import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const songsTable = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist"),
  key: text("key"),
  bpm: integer("bpm"),
  tags: text("tags").array().notNull().default([]),
  lyrics: text("lyrics"),
  chordChart: text("chord_chart"),
  youtubeUrl: text("youtube_url"),
  notes: text("notes"),
  isNew: boolean("is_new").notNull().default(false),
  hasBrass: boolean("has_brass").notNull().default(false),
  cifraClubUrl: text("cifra_club_url"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSongSchema = createInsertSchema(songsTable).omit({ id: true, createdAt: true });
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songsTable.$inferSelect;
