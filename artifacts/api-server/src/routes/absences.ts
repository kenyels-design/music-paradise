import { Router, type IRouter } from "express";
import { db, absencesTable, membersTable, insertAbsenceSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// List all absences (optionally filter by date)
router.get("/absences", async (req, res) => {
  const { date, memberId } = req.query;
  let query = db
    .select({
      id: absencesTable.id,
      memberId: absencesTable.memberId,
      date: absencesTable.date,
      reason: absencesTable.reason,
      createdAt: absencesTable.createdAt,
      memberName: membersTable.name,
      memberRole: membersTable.role,
    })
    .from(absencesTable)
    .leftJoin(membersTable, eq(absencesTable.memberId, membersTable.id));

  const rows = await query.orderBy(absencesTable.date);
  
  let result = rows;
  if (date) result = result.filter(r => r.date === date);
  if (memberId) result = result.filter(r => r.memberId === Number(memberId));
  
  res.json(result);
});

// Create absence
router.post("/absences", async (req, res) => {
  const parsed = insertAbsenceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const [absence] = await db.insert(absencesTable).values(parsed.data).returning();
  res.status(201).json(absence);
});

// Delete absence
router.delete("/absences/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(absencesTable).where(eq(absencesTable.id, id));
  res.status(204).send();
});

export default router;
