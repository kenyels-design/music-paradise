import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { songsTable } from "./songs";
import { servicesTable } from "./services";

export const setlistItemsTable = pgTable("setlist_items", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id, { onDelete: "cascade" }),
  songId: integer("song_id").notNull().references(() => songsTable.id, { onDelete: "cascade" }),
  order: integer("order").notNull().default(0),
  keyOverride: text("key_override"),
  notes: text("notes"),
});

export const insertSetlistItemSchema = createInsertSchema(setlistItemsTable).omit({ id: true });
export type InsertSetlistItem = z.infer<typeof insertSetlistItemSchema>;
export type SetlistItem = typeof setlistItemsTable.$inferSelect;
