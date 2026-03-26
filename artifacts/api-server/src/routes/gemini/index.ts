import { Router, type IRouter } from "express";
import {
  CreateGeminiConversationBody,
  GetGeminiConversationParams,
  DeleteGeminiConversationParams,
  ListGeminiMessagesParams,
  SendGeminiMessageParams,
  SendGeminiMessageBody,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { db } from "@workspace/db";
import { conversations as conversationsTable, messages as messagesTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/conversations", async (req, res) => {
  try {
    const conversations = await db.select().from(conversationsTable).orderBy(conversationsTable.createdAt);
    res.json(conversations);
  } catch (err) {
    req.log.error({ err }, "Error listing conversations");
    res.status(500).json({ error: "Erro ao buscar conversas" });
  }
});

router.post("/conversations", async (req, res) => {
  const parsed = CreateGeminiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Corpo inválido" });
    return;
  }
  try {
    const [conversation] = await db.insert(conversationsTable).values(parsed.data).returning();
    res.status(201).json(conversation);
  } catch (err) {
    req.log.error({ err }, "Error creating conversation");
    res.status(500).json({ error: "Erro ao criar conversa" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  const parsed = GetGeminiConversationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  try {
    const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, parsed.data.id));
    if (!conversation) {
      res.status(404).json({ error: "Conversa não encontrada" });
      return;
    }
    const messages = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, parsed.data.id))
      .orderBy(asc(messagesTable.createdAt));
    res.json({ ...conversation, messages });
  } catch (err) {
    req.log.error({ err }, "Error getting conversation");
    res.status(500).json({ error: "Erro ao buscar conversa" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  const parsed = DeleteGeminiConversationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  try {
    const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, parsed.data.id));
    if (!conversation) {
      res.status(404).json({ error: "Conversa não encontrada" });
      return;
    }
    await db.delete(messagesTable).where(eq(messagesTable.conversationId, parsed.data.id));
    await db.delete(conversationsTable).where(eq(conversationsTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting conversation");
    res.status(500).json({ error: "Erro ao deletar conversa" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  const parsed = ListGeminiMessagesParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }
  try {
    const messages = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, parsed.data.id))
      .orderBy(asc(messagesTable.createdAt));
    res.json(messages);
  } catch (err) {
    req.log.error({ err }, "Error listing messages");
    res.status(500).json({ error: "Erro ao buscar mensagens" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  const paramsParsed = SendGeminiMessageParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = SendGeminiMessageBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }

  const conversationId = paramsParsed.data.id;
  const { content } = bodyParsed.data;

  try {
    await db.insert(messagesTable).values({ conversationId, role: "user", content });

    const history = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(asc(messagesTable.createdAt));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: { maxOutputTokens: 8192 },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({ conversationId, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Error sending message");
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro ao processar mensagem" });
    }
  }
});

export default router;
