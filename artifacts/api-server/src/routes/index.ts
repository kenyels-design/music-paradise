import { Router, type IRouter } from "express";
import healthRouter from "./health";
import membersRouter from "./members";
import songsRouter from "./songs";
import servicesRouter from "./services";
import setlistsRouter from "./setlists";
import announcementsRouter from "./announcements";

const router: IRouter = Router();

router.use(healthRouter);
router.use(membersRouter);
router.use(songsRouter);
router.use(servicesRouter);
router.use(setlistsRouter);
router.use(announcementsRouter);

export default router;
