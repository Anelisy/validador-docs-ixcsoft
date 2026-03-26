import { Router, type IRouter } from "express";
import { ValidateDocBody, GenerateDocBody, WikiSearchBody } from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { db } from "@workspace/db";
import { fieldsTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";

const router: IRouter = Router();

const SYSTEM_CONTEXT = `Você é um especialista em documentação técnica para sistemas ERP (IXC Soft). Seu papel é transformar insumos técnicos em documentação semântica detalhada e reutilizável, pronta para o Outline.

Regras:
- Inferir o módulo quando não vier explicitamente e declarar a inferência
- Não inventar nomes de tabelas, funções, endpoints ou campos sem evidência; usar "não informado" ou "(inferência)"
- Priorizar regra de negócio e impacto sistêmico
- Tom profissional, técnico e descritivo (texto será consumido por IA)
- SEM prefácio conversacional ou metacomentários`;

const DOC_SECTIONS = `
# [Título descritivo]

## Contexto do módulo
[1-3 parágrafos explicando o problema de negócio que a funcionalidade atende]

## Objetivo de negócio
- [dor ou necessidade]
- [comportamento esperado do sistema]
- [resultado percebido pelo usuário]

## Mapeamento de regras de negócio
1. [Gatilho]
2. [Validações]
3. [Decisão e processamento]
4. [Persistência]
5. [Retorno visual]
6. [Exceções e bloqueios]

## Dicionário de interface e campos
| Nome do campo | Tipo | Descrição | Regra/Opções |
|---|---|---|---|
| campo_exemplo | Texto | Descrição do campo | Obrigatório |

(Tipos: Texto, Data, Número, Booleano, Seleção, Arquivo, Tabela, Oculto, Não informado)

## Análise de impacto (developer view)
- Funções/rotinas afetadas: [lista]
- Tabelas com leitura/escrita: [lista]
- Pontos de quebra com input inesperado: [lista]
- Impactos em navegação/permissões/integrações: [lista]

## Histórico de mudança
| Aspecto | O que era | O que é agora | Impacto direto para o usuário |
|---|---|---|---|

## Integrações e APIs
[Sistemas externos citados; se não houver: "Não há integração externa evidenciada no insumo"]

## Critérios de atenção, riscos e validações
- [ ] [validação obrigatória]
- [ ] [risco de regressão]
- [ ] [dependência implícita]
- [ ] [cenário de teste recomendado]`;

const WIKI_BASE_URL = "https://wiki-erp.ixcsoft.com.br/documentacao/";

async function searchWiki(query: string): Promise<Array<{title: string, url: string, relevance: string, action: string}>> {
  try {
    const searchUrl = `${WIKI_BASE_URL}?search=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "DocValidator/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const matches: Array<{title: string, url: string, relevance: string, action: string}> = [];
    const linkRegex = /<a[^>]+href="(https?:\/\/[^"]*documentacao[^"]*)"[^>]*>([^<]{5,120})<\/a>/gi;
    let match;
    let count = 0;
    while ((match = linkRegex.exec(html)) !== null && count < 8) {
      const href = match[1];
      const title = match[2].trim().replace(/\s+/g, " ");
      if (title.length > 5) {
        const queryWords = query.toLowerCase().split(" ").filter(w => w.length > 3);
        const titleLower = title.toLowerCase();
        const relevance = queryWords.some(w => titleLower.includes(w)) ? "high" : "medium";
        matches.push({ title, url: href, relevance, action: "Verificar se esta página precisa ser atualizada" });
        count++;
      }
    }
    return matches;
  } catch {
    return [];
  }
}

type RawField = { fieldName: string; tableName: string; sectionName?: string; module: string; description?: string; fieldType?: string };

async function autoSaveFields(fields: RawField[]): Promise<number> {
  if (!fields.length) return 0;
  let saved = 0;
  for (const f of fields) {
    if (!f.fieldName || !f.tableName || !f.module) continue;
    // Safety net: never save records where any field contains "(inferência)"
    if (f.tableName.includes("inferência") || f.tableName.includes("inferencia")) continue;
    const existing = await db
      .select({ id: fieldsTable.id })
      .from(fieldsTable)
      .where(and(eq(fieldsTable.fieldName, f.fieldName), eq(fieldsTable.tableName, f.tableName), eq(fieldsTable.module, f.module)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(fieldsTable).values({
        fieldName: f.fieldName,
        tableName: f.tableName,
        sectionName: f.sectionName ?? null,
        module: f.module,
        description: f.description ?? null,
        fieldType: f.fieldType ?? null,
      });
      saved++;
    }
  }
  return saved;
}

async function generateText(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 8192 },
  });
  return response.text ?? "";
}

function extractJsonFromText(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  return JSON.parse(cleaned);
}

router.post("/validate", async (req, res) => {
  const parsed = ValidateDocBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Corpo inválido" });
    return;
  }
  const { documentation, module } = parsed.data;

  try {
    // Call 1: compact JSON with metadata only (score, suggestions, fields, keywords)
    const analysisPrompt = `${SYSTEM_CONTEXT}

Módulo informado: ${module ?? "não informado"}

Documentação a analisar:
---
${documentation}
---

REGRAS PARA extractedFields — leia com atenção:
- "tableName" = nome da ABA/TELA onde o campo aparece na interface (ex: "Recebimentos", "Ordens de Serviço", "Cadastro de Cliente", "Dados Fiscais")
- Use o nome da tela ou funcionalidade mais próxima mencionada no texto — pode ser um título de seção, nome de menu, ou descrição de tela
- PROIBIDO usar a palavra "inferência" ou qualquer variante em qualquer campo — NUNCA coloque "(inferência)" em tableName
- "sectionName" = nome da sub-seção DENTRO da aba, quando houver (ex: "Dados Bancários", "Filtros Avançados"). Omita se não houver
- NÃO use nomes de tabelas de banco de dados — use os nomes visuais da interface
- "fieldType" = tipo visual do campo (Texto, Número, Data, Booleano, Seleção, Arquivo, Moeda, etc.)

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`), com esta estrutura exata:
{"isValid":true,"score":75,"inferredModule":"Financeiro","suggestions":[{"type":"warning","section":"Contexto do módulo","message":"Falta descrição do problema de negócio","suggestion":"Adicionar 1-3 parágrafos explicando o contexto"}],"missingFields":["Histórico de mudança","Critérios de atenção"],"extractedFields":[{"fieldName":"data_vencimento","tableName":"Recebimentos","sectionName":"Dados Bancários","module":"Financeiro","description":"Data de vencimento da fatura do cliente","fieldType":"Data"}],"wikiKeywords":["financeiro","fatura","vencimento"]}

Mantenha os arrays curtos (máx 5 itens cada). Sem texto antes ou depois do JSON.`;

    const analysisText = await generateText(analysisPrompt);

    type AnalysisResult = {
      isValid: boolean;
      score: number;
      inferredModule: string;
      suggestions: Array<{ type: string; section: string; message: string; suggestion?: string }>;
      missingFields: string[];
      extractedFields: Array<{ fieldName: string; tableName: string; sectionName?: string; module: string; description?: string; fieldType?: string }>;
      wikiKeywords: string[];
    };

    let analysis: AnalysisResult;
    try {
      analysis = extractJsonFromText(analysisText) as AnalysisResult;
    } catch {
      analysis = {
        isValid: false,
        score: 0,
        inferredModule: module ?? "Não identificado",
        suggestions: [{ type: "error", section: "Geral", message: "Não foi possível analisar a documentação completamente" }],
        missingFields: [],
        extractedFields: [],
        wikiKeywords: [module ?? "documentacao"],
      };
    }

    // Call 2: plain text formatted doc — NO JSON wrapping, avoids truncation issue
    const formatPrompt = `${SYSTEM_CONTEXT}

Módulo: ${analysis.inferredModule ?? module ?? "não informado"}

Documentação original:
---
${documentation}
---

Reescreva e melhore esta documentação seguindo EXATAMENTE este modelo de seções:
${DOC_SECTIONS}

Retorne APENAS o markdown da documentação, sem JSON, sem explicações adicionais.`;

    const formattedDoc = await generateText(formatPrompt);

    const wikiQuery = (analysis.wikiKeywords ?? [module ?? "documentacao"]).slice(0, 3).join(" ");
    const [wikiMatches, savedFieldsCount] = await Promise.all([
      searchWiki(wikiQuery),
      autoSaveFields(analysis.extractedFields ?? []),
    ]);

    res.json({
      isValid: analysis.isValid ?? false,
      score: analysis.score ?? 0,
      suggestions: analysis.suggestions ?? [],
      missingFields: analysis.missingFields ?? [],
      wikiMatches,
      extractedFields: analysis.extractedFields ?? [],
      formattedDoc: formattedDoc.trim() || null,
      savedFieldsCount,
    });
  } catch (err) {
    req.log.error({ err }, "Error validating doc");
    res.status(500).json({ error: "Erro ao validar documentação. Tente novamente." });
  }
});

router.post("/generate", async (req, res) => {
  const parsed = GenerateDocBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Corpo inválido" });
    return;
  }
  const { cardContent, module } = parsed.data;

  try {
    // Call 1: compact JSON metadata — fields + keywords only
    const metaPrompt = `${SYSTEM_CONTEXT}

Módulo informado: ${module ?? "não informado (infira do conteúdo)"}

Card/resolução do dev:
---
${cardContent}
---

REGRAS PARA extractedFields — leia com atenção:
- "tableName" = nome da ABA/TELA onde o campo aparece na interface (ex: "Recebimentos", "Ordens de Serviço", "Cadastro de Cliente", "Configurações")
- Use o nome da tela ou funcionalidade mais próxima descrita no texto — título de seção, menu ou descrição de tela
- PROIBIDO usar a palavra "inferência" ou qualquer variante em qualquer campo — NUNCA use "(inferência)" em tableName
- "sectionName" = nome da sub-seção DENTRO da aba, quando houver (ex: "Dados Bancários", "Informações Adicionais"). Omita se não houver
- NÃO use nomes de tabelas de banco de dados — use os nomes visuais da interface
- "fieldType" = tipo visual do campo (Texto, Número, Data, Booleano, Seleção, Moeda, Arquivo, etc.)

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`), com esta estrutura exata:
{"inferredModule":"Financeiro","extractedFields":[{"fieldName":"data_vencimento","tableName":"Recebimentos","sectionName":"Dados Bancários","module":"Financeiro","description":"Data de vencimento da fatura do cliente","fieldType":"Data"}],"wikiKeywords":["financeiro","fatura"]}

Mantenha extractedFields com máx 10 itens. Sem texto antes ou depois do JSON.`;

    const metaText = await generateText(metaPrompt);

    type MetaResult = {
      inferredModule: string;
      extractedFields: Array<{ fieldName: string; tableName: string; sectionName?: string; module: string; description?: string; fieldType?: string }>;
      wikiKeywords: string[];
    };

    let meta: MetaResult;
    try {
      meta = extractJsonFromText(metaText) as MetaResult;
    } catch {
      meta = {
        inferredModule: module ?? "Não identificado",
        extractedFields: [],
        wikiKeywords: [module ?? "documentacao"],
      };
    }

    // Call 2: plain text documentation — NO JSON, avoids truncation
    const docPrompt = `${SYSTEM_CONTEXT}

Módulo: ${meta.inferredModule ?? module ?? "não informado"}

Card/resolução do dev:
---
${cardContent}
---

Gere a documentação técnica completa seguindo EXATAMENTE este modelo de seções:
${DOC_SECTIONS}

Retorne APENAS o markdown da documentação, sem JSON, sem explicações adicionais.`;

    const documentation = await generateText(docPrompt);

    const wikiQuery = (meta.wikiKeywords ?? [module ?? "documentacao"]).slice(0, 3).join(" ");
    const [wikiMatches, savedFieldsCount] = await Promise.all([
      searchWiki(wikiQuery),
      autoSaveFields(meta.extractedFields ?? []),
    ]);

    res.json({
      documentation: documentation.trim(),
      inferredModule: meta.inferredModule ?? module ?? "Não identificado",
      extractedFields: meta.extractedFields ?? [],
      wikiMatches,
      savedFieldsCount,
    });
  } catch (err) {
    req.log.error({ err }, "Error generating doc");
    res.status(500).json({ error: "Erro ao gerar documentação. Tente novamente." });
  }
});

router.post("/fetch-url", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "URL inválida" });
    return;
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "DocValidator/1.0",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      res.status(400).json({ error: `Não foi possível acessar a URL (status ${response.status})` });
      return;
    }

    const html = await response.text();

    // Extract meaningful content: prefer <article>, <main>, or <body>
    const extractSection = (tag: string): string | null => {
      const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i"));
      return match ? match[1] : null;
    };

    const rawContent =
      extractSection("article") ||
      extractSection("main") ||
      extractSection("body") ||
      html;

    // Strip HTML tags and decode entities
    const text = rawContent
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s{2,}/g, "\n")
      .trim();

    if (text.length < 50) {
      res.status(400).json({ error: "Não foi possível extrair conteúdo suficiente da página." });
      return;
    }

    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;

    res.json({ text: text.slice(0, 20000), title, charCount: text.length });
  } catch (err) {
    req.log.error({ err }, "Error fetching URL");
    res.status(500).json({ error: "Falha ao buscar URL. Verifique se o endereço está acessível." });
  }
});

router.post("/wiki-search", async (req, res) => {
  const parsed = WikiSearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Corpo inválido" });
    return;
  }
  const { query } = parsed.data;
  const results = await searchWiki(query);
  res.json({ results });
});

export default router;
