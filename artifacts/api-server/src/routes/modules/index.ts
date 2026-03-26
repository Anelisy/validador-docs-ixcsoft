import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { modulesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const modules = await db.select().from(modulesTable).orderBy(modulesTable.name);
    res.json(modules);
  } catch (err) {
    req.log.error({ err }, "Error listing modules");
    res.status(500).json({ error: "Erro ao buscar módulos" });
  }
});

router.post("/", async (req, res) => {
  const { name, description } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Nome obrigatório" });
    return;
  }
  try {
    const [mod] = await db.insert(modulesTable).values({
      name: name.trim(),
      description: description?.trim() || null,
    }).returning();
    res.status(201).json(mod);
  } catch (err) {
    req.log.error({ err }, "Error creating module");
    res.status(500).json({ error: "Erro ao criar módulo" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    await db.delete(modulesTable).where(eq(modulesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting module");
    res.status(500).json({ error: "Erro ao deletar módulo" });
  }
});

export default router;
