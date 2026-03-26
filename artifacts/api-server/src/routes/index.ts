import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geminiRouter from "./gemini/index";
import validatorRouter from "./validator/index";
import fieldsRouter from "./fields/index";
import modulesRouter from "./modules/index";
import authRouter from "./auth/index";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);

router.use(requireAuth);

router.use("/gemini", geminiRouter);
router.use("/validator", validatorRouter);
router.use("/fields", fieldsRouter);
router.use("/modules", modulesRouter);

export default router;
