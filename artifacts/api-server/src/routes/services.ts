import { Router, type IRouter } from "express";
import {
  db,
  servicesTable,
  insertServiceSchema,
  serviceAssignmentsTable,
  insertServiceAssignmentSchema,
  membersTable,
} from "@workspace/db";
import { eq, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/services", async (req, res) => {
  const { upcoming } = req.query as { upcoming?: string };
  let query = db.select().from(servicesTable).$dynamic();

  if (upcoming === "true") {
    const today = new Date().toISOString().split("T")[0];
    query = query.where(gte(servicesTable.date, today));
  }

  const services = await query.orderBy(servicesTable.date);
  res.json(services);
});

router.post("/services", async (req, res) => {
  const parsed = insertServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [service] = await db.insert(servicesTable).values(parsed.data).returning();
  res.status(201).json(service);
});

router.get("/services/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(service);
});

router.put("/services/:id", async (req, res) => {
  const id = Number(req.params.id);
  const parsed = insertServiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [service] = await db
    .update(servicesTable)
    .set(parsed.data)
    .where(eq(servicesTable.id, id))
    .returning();
  if (!service) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json(service);
});

router.delete("/services/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(servicesTable).where(eq(servicesTable.id, id));
  res.status(204).send();
});

// Assignments
router.get("/services/:id/assignments", async (req, res) => {
  const serviceId = Number(req.params.id);
  const assignments = await db
    .select()
    .from(serviceAssignmentsTable)
    .leftJoin(membersTable, eq(serviceAssignmentsTable.memberId, membersTable.id))
    .where(eq(serviceAssignmentsTable.serviceId, serviceId));

  const result = assignments.map(({ service_assignments, members }) => ({
    ...service_assignments,
    member: members,
  }));
  res.json(result);
});

router.post("/services/:id/assignments", async (req, res) => {
  const serviceId = Number(req.params.id);
  const parsed = insertServiceAssignmentSchema.safeParse({ ...req.body, serviceId });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [assignment] = await db.insert(serviceAssignmentsTable).values(parsed.data).returning();
  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, assignment.memberId));
  res.status(201).json({ ...assignment, member });
});

router.delete("/services/:id/assignments/:assignmentId", async (req, res) => {
  const assignmentId = Number(req.params.assignmentId);
  await db.delete(serviceAssignmentsTable).where(eq(serviceAssignmentsTable.id, assignmentId));
  res.status(204).send();
});

export default router;
