import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { membersTable } from "./members";
import { servicesTable } from "./services";

export const serviceAssignmentsTable = pgTable("service_assignments", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id, { onDelete: "cascade" }),
  memberId: integer("member_id").notNull().references(() => membersTable.id, { onDelete: "cascade" }),
  role: text("role"),
});

export const insertServiceAssignmentSchema = createInsertSchema(serviceAssignmentsTable).omit({ id: true });
export type InsertServiceAssignment = z.infer<typeof insertServiceAssignmentSchema>;
export type ServiceAssignment = typeof serviceAssignmentsTable.$inferSelect;
