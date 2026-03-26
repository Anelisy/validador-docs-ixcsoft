import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, createToken, verifyToken } from "./tokens";
import { requireAuth, requireAdmin } from "../../middleware/auth";

const router = Router();

/* ──────────────────────────────────────────────────────────────
   POST /api/auth/setup  — cria o primeiro admin (só funciona se
   não houver nenhum usuário cadastrado)
────────────────────────────────────────────────────────────── */
router.post("/setup", async (req, res) => {
  try {
    const existing = await db.select().from(usersTable).limit(1);
    if (existing.length > 0) {
      res.status(403).json({ error: "Setup já foi realizado." });
      return;
    }

    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      res.status(400).json({ error: "Email, nome e senha são obrigatórios." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });
      return;
    }

    const [user] = await db
      .insert(usersTable)
      .values({ email: email.toLowerCase().trim(), name, passwordHash: hashPassword(password), isAdmin: true })
      .returning();

    const token = createToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   POST /api/auth/login
────────────────────────────────────────────────────────────── */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email e senha são obrigatórios." });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "Email ou senha inválidos." });
      return;
    }

    const token = createToken(user.id);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   GET /api/auth/me
────────────────────────────────────────────────────────────── */
router.get("/me", requireAuth, (req, res) => {
  const u = (req as any).user;
  res.json({ id: u.id, email: u.email, name: u.name, isAdmin: u.isAdmin });
});

/* ──────────────────────────────────────────────────────────────
   GET /api/auth/users  — lista usuários (admin)
────────────────────────────────────────────────────────────── */
router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const users = await db
      .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, isAdmin: usersTable.isAdmin, createdAt: usersTable.createdAt })
      .from(usersTable)
      .orderBy(usersTable.createdAt);
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   POST /api/auth/users  — cria usuário (admin)
────────────────────────────────────────────────────────────── */
router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, name, password, isAdmin } = req.body;
    if (!email || !name || !password) {
      res.status(400).json({ error: "Email, nome e senha são obrigatórios." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });
      return;
    }

    const [user] = await db
      .insert(usersTable)
      .values({ email: email.toLowerCase().trim(), name, passwordHash: hashPassword(password), isAdmin: Boolean(isAdmin) })
      .returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, isAdmin: usersTable.isAdmin, createdAt: usersTable.createdAt });

    res.status(201).json(user);
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Email já cadastrado." });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

/* ──────────────────────────────────────────────────────────────
   DELETE /api/auth/users/:id  — remove usuário (admin)
────────────────────────────────────────────────────────────── */
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const me = (req as any).user;

    if (me.id === id) {
      res.status(400).json({ error: "Não é possível remover sua própria conta." });
      return;
    }

    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   PUT /api/auth/users/:id/password  — muda senha
────────────────────────────────────────────────────────────── */
router.put("/users/:id/password", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const me = (req as any).user;

    if (me.id !== id && !me.isAdmin) {
      res.status(403).json({ error: "Acesso negado." });
      return;
    }

    const { password } = req.body;
    if (!password || password.length < 6) {
      res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });
      return;
    }

    await db
      .update(usersTable)
      .set({ passwordHash: hashPassword(password) })
      .where(eq(usersTable.id, id));

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ──────────────────────────────────────────────────────────────
   GET /api/auth/status  — verifica se há usuários cadastrados
   (usado para mostrar tela de setup inicial)
────────────────────────────────────────────────────────────── */
router.get("/status", async (_req, res) => {
  try {
    const [first] = await db.select({ id: usersTable.id }).from(usersTable).limit(1);
    res.json({ hasUsers: Boolean(first) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
