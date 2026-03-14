import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { membersTable } from "./members";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const absencesTable = pgTable("absences", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull().references(() => membersTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAbsenceSchema = createInsertSchema(absencesTable).omit({ id: true, createdAt: true });
export type InsertAbsence = z.infer<typeof insertAbsenceSchema>;
export type Absence = typeof absencesTable.$inferSelect;
