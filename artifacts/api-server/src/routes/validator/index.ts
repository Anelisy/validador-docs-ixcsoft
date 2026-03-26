import { Router, type IRouter } from "express";
import { ValidateDocBody, GenerateDocBody, WikiSearchBody } from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";

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

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`), com esta estrutura exata:
{"isValid":true,"score":75,"inferredModule":"Financeiro","suggestions":[{"type":"warning","section":"Contexto do módulo","message":"Falta descrição do problema de negócio","suggestion":"Adicionar 1-3 parágrafos explicando o contexto"}],"missingFields":["Histórico de mudança","Critérios de atenção"],"extractedFields":[{"fieldName":"data_vencimento","tableName":"faturas","module":"Financeiro","description":"Data de vencimento da fatura do cliente","fieldType":"Data"}],"wikiKeywords":["financeiro","fatura","vencimento"]}

Mantenha os arrays curtos (máx 5 itens cada). Sem texto antes ou depois do JSON.`;

    const analysisText = await generateText(analysisPrompt);

    type AnalysisResult = {
      isValid: boolean;
      score: number;
      inferredModule: string;
      suggestions: Array<{ type: string; section: string; message: string; suggestion?: string }>;
      missingFields: string[];
      extractedFields: Array<{ fieldName: string; tableName: string; module: string; description?: string; fieldType?: string }>;
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
    const wikiMatches = await searchWiki(wikiQuery);

    res.json({
      isValid: analysis.isValid ?? false,
      score: analysis.score ?? 0,
      suggestions: analysis.suggestions ?? [],
      missingFields: analysis.missingFields ?? [],
      wikiMatches,
      extractedFields: analysis.extractedFields ?? [],
      formattedDoc: formattedDoc.trim() || null,
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

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`), com esta estrutura exata:
{"inferredModule":"Financeiro","extractedFields":[{"fieldName":"data_vencimento","tableName":"faturas","module":"Financeiro","description":"Data de vencimento da fatura do cliente","fieldType":"Data"}],"wikiKeywords":["financeiro","fatura"]}

Mantenha extractedFields com máx 10 itens. Sem texto antes ou depois do JSON.`;

    const metaText = await generateText(metaPrompt);

    type MetaResult = {
      inferredModule: string;
      extractedFields: Array<{ fieldName: string; tableName: string; module: string; description?: string; fieldType?: string }>;
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
    const wikiMatches = await searchWiki(wikiQuery);

    res.json({
      documentation: documentation.trim(),
      inferredModule: meta.inferredModule ?? module ?? "Não identificado",
      extractedFields: meta.extractedFields ?? [],
      wikiMatches,
    });
  } catch (err) {
    req.log.error({ err }, "Error generating doc");
    res.status(500).json({ error: "Erro ao gerar documentação. Tente novamente." });
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
