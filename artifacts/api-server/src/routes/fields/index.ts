import { Router, type IRouter } from "express";
import { CreateFieldBody, DeleteFieldParams } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { fieldsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const fields = await db.select().from(fieldsTable).orderBy(fieldsTable.createdAt);
    res.json(fields);
  } catch (err) {
    req.log.error({ err }, "Error listing fields");
    res.status(500).json({ error: "Erro ao buscar campos" });
  }
});

router.post("/", async (req, res) => {
  const parsed = CreateFieldBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Corpo inválido", details: parsed.error });
    return;
  }
  try {
    const [field] = await db.insert(fieldsTable).values(parsed.data).returning();
    res.status(201).json(field);
  } catch (err) {
    req.log.error({ err }, "Error creating field");
    res.status(500).json({ error: "Erro ao criar campo" });
  }
});

router.get("/mindmap", async (req, res) => {
  try {
    const fields = await db.select().from(fieldsTable);

    const modules = new Map<string, Set<string>>();
    const tableFields = new Map<string, Array<typeof fields[0]>>();

    for (const field of fields) {
      if (!modules.has(field.module)) {
        modules.set(field.module, new Set());
      }
      modules.get(field.module)!.add(field.tableName);

      const key = `${field.module}::${field.tableName}`;
      if (!tableFields.has(key)) {
        tableFields.set(key, []);
      }
      tableFields.get(key)!.push(field);
    }

    const nodes: Array<{id: string, label: string, type: string, data: Record<string, unknown>}> = [];
    const edges: Array<{id: string, source: string, target: string, label?: string}> = [];

    const centerX = 0;
    const centerY = 0;
    const moduleRadius = 400;
    const tableRadius = 250;
    const fieldRadius = 150;

    const moduleList = Array.from(modules.keys());
    moduleList.forEach((moduleName, mi) => {
      const moduleAngle = (2 * Math.PI * mi) / moduleList.length;
      const mx = centerX + moduleRadius * Math.cos(moduleAngle);
      const my = centerY + moduleRadius * Math.sin(moduleAngle);

      const moduleId = `module-${moduleName}`;
      nodes.push({
        id: moduleId,
        label: moduleName,
        type: "module",
        data: { x: mx, y: my, fieldCount: fields.filter(f => f.module === moduleName).length },
      });

      const tables = Array.from(modules.get(moduleName)!);
      tables.forEach((tableName, ti) => {
        const tableAngle = moduleAngle + (2 * Math.PI * (ti - tables.length / 2)) / (tables.length * 3);
        const tx = mx + tableRadius * Math.cos(tableAngle);
        const ty = my + tableRadius * Math.sin(tableAngle);

        const tableId = `table-${moduleName}-${tableName}`;
        nodes.push({
          id: tableId,
          label: tableName,
          type: "table",
          data: { x: tx, y: ty, module: moduleName },
        });
        edges.push({
          id: `edge-${moduleId}-${tableId}`,
          source: moduleId,
          target: tableId,
        });

        const key = `${moduleName}::${tableName}`;
        const tFields = tableFields.get(key) ?? [];
        tFields.forEach((field, fi) => {
          const fieldAngle = tableAngle + (2 * Math.PI * (fi - tFields.length / 2)) / (tFields.length * 4);
          const fx = tx + fieldRadius * Math.cos(fieldAngle);
          const fy = ty + fieldRadius * Math.sin(fieldAngle);

          const fieldId = `field-${field.id}`;
          nodes.push({
            id: fieldId,
            label: field.fieldName,
            type: "field",
            data: {
              x: fx,
              y: fy,
              description: field.description,
              fieldType: field.fieldType,
              tableName: field.tableName,
              module: field.module,
            },
          });
          edges.push({
            id: `edge-${tableId}-${fieldId}`,
            source: tableId,
            target: fieldId,
            label: field.fieldType ?? undefined,
          });
        });
      });
    });

    res.json({ nodes, edges });
  } catch (err) {
    req.log.error({ err }, "Error building mindmap");
    res.status(500).json({ error: "Erro ao construir mapa mental" });
  }
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteFieldParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  try {
    await db.delete(fieldsTable).where(eq(fieldsTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting field");
    res.status(500).json({ error: "Erro ao deletar campo" });
  }
});

export default router;
