import { Router, type IRouter } from "express";
import healthRouter from "./health";
import geminiRouter from "./gemini/index";
import validatorRouter from "./validator/index";
import fieldsRouter from "./fields/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/gemini", geminiRouter);
router.use("/validator", validatorRouter);
router.use("/fields", fieldsRouter);

export default router;
