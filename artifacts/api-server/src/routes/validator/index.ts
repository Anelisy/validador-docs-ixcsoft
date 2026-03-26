import { Router, type IRouter } from "express";
import { ValidateDocBody, GenerateDocBody, WikiSearchBody } from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

const SYSTEM_CONTEXT = `Você é um especialista em documentação técnica para sistemas ERP (IXC Soft). Seu papel é transformar insumos técnicos em documentação semântica, detalhada e reutilizável, pronta para colar no Outline.

Regras de comportamento:
- Inferir o módulo quando não vier explicitamente e declarar a inferência
- Não inventar nomes de tabelas, funções, endpoints, campos ou integrações; quando faltarem evidências, usar "não informado", "não especificado" ou "(inferência)"
- Priorizar explicação de regra de negócio e impacto sistêmico antes de repetir o texto do card
- Traduzir linguagem de desenvolvimento para linguagem de documentação técnica sem perder precisão
- Manter tom profissional, técnico e descritivo (o texto será consumido por IA futuramente)
- NÃO incluir prefácio conversacional, metacomentários ou introduções`;

const DOC_STRUCTURE = `A documentação deve seguir SEMPRE esta estrutura em markdown, nesta ordem:
# [Título descritivo]

## Contexto do módulo
[1-3 parágrafos explicando qual problema de negócio a funcionalidade atende]

## Objetivo de negócio
[Bullets curtos: dor/necessidade, comportamento esperado, resultado percebido pelo usuário]

## Mapeamento de regras de negócio
[Passos numerados: gatilho, validações, decisão, persistência, retorno visual, exceções]

## Dicionário de interface e campos
| Nome do campo | Tipo | Descrição | Regra/Opções |
|---|---|---|---|
[Tipos permitidos: Texto, Data, Número, Booleano, Seleção, Arquivo, Tabela, Oculto, Não informado]

## Análise de impacto (developer view)
[Funções/rotinas afetadas, tabelas com leitura/escrita, pontos de quebra, impactos em navegação/permissões/integrações]

## Histórico de mudança
| Aspecto | O que era | O que é agora | Impacto direto para o usuário |
|---|---|---|---|

## Integrações e APIs
[Sistemas externos citados ou inferíveis; se não houver: "não há integração externa evidenciada no insumo"]

## Critérios de atenção, riscos e validações
[Checklist: validações obrigatórias, riscos de regressão, dependências implícitas, cenários de teste]`;

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
        matches.push({
          title,
          url: href,
          relevance,
          action: "Verificar se esta página precisa ser atualizada com as novas informações",
        });
        count++;
      }
    }
    return matches;
  } catch {
    return [];
  }
}

async function callGeminiJson<T>(prompt: string): Promise<T> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });
  const text = response.text ?? "{}";
  return JSON.parse(text) as T;
}

router.post("/validate", async (req, res) => {
  const parsed = ValidateDocBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Corpo inválido", details: parsed.error });
    return;
  }
  const { documentation, module } = parsed.data;

  try {
    type AnalysisResult = {
      isValid: boolean;
      score: number;
      inferredModule: string;
      suggestions: Array<{ type: string; section: string; message: string; suggestion?: string }>;
      missingFields: string[];
      extractedFields: Array<{ fieldName: string; tableName: string; module: string; description?: string; fieldType?: string }>;
      wikiKeywords: string[];
    };

    const analysisPrompt = `${SYSTEM_CONTEXT}

Módulo informado: ${module ?? "não informado"}

Documentação a validar:
---
${documentation}
---

Analise esta documentação e retorne um objeto JSON com exatamente estes campos:
{
  "isValid": boolean (true se a doc está bem estruturada e completa),
  "score": number de 0 a 100 (qualidade geral),
  "inferredModule": string (módulo do sistema identificado),
  "suggestions": array de objetos com { "type": "error"|"warning"|"info", "section": string, "message": string, "suggestion": string },
  "missingFields": array de strings (seções ou informações ausentes),
  "extractedFields": array de objetos com { "fieldName": string, "tableName": string, "module": string, "description": string, "fieldType": string },
  "wikiKeywords": array de strings (3-5 palavras-chave para buscar na wiki do produto)
}`;

    const analysis = await callGeminiJson<AnalysisResult>(analysisPrompt);

    type FormatResult = { formattedDoc: string };
    const formatPrompt = `${SYSTEM_CONTEXT}

${DOC_STRUCTURE}

Módulo: ${analysis.inferredModule ?? module ?? "não informado"}

Documentação original a reformatar:
---
${documentation}
---

Retorne um objeto JSON com exatamente um campo:
{
  "formattedDoc": string (a documentação reformatada integralmente seguindo a estrutura acima, em markdown)
}`;

    const formatResult = await callGeminiJson<FormatResult>(formatPrompt);

    const wikiKeywords = analysis.wikiKeywords ?? [module ?? "documentacao"];
    const wikiQuery = wikiKeywords.slice(0, 3).join(" ");
    const wikiMatches = await searchWiki(wikiQuery);

    res.json({
      isValid: analysis.isValid ?? false,
      score: analysis.score ?? 0,
      suggestions: analysis.suggestions ?? [],
      missingFields: analysis.missingFields ?? [],
      wikiMatches,
      extractedFields: analysis.extractedFields ?? [],
      formattedDoc: formatResult.formattedDoc ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Error validating doc");
    res.status(500).json({ error: "Erro ao validar documentação. Tente novamente." });
  }
});

router.post("/generate", async (req, res) => {
  const parsed = GenerateDocBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Corpo inválido", details: parsed.error });
    return;
  }
  const { cardContent, module } = parsed.data;

  try {
    type GenerateResult = {
      documentation: string;
      inferredModule: string;
      extractedFields: Array<{ fieldName: string; tableName: string; module: string; description?: string; fieldType?: string }>;
      wikiKeywords: string[];
    };

    const prompt = `${SYSTEM_CONTEXT}

${DOC_STRUCTURE}

Módulo informado: ${module ?? "não informado (infira a partir do conteúdo)"}

Conteúdo do card/resolução do dev:
---
${cardContent}
---

Gere a documentação completa seguindo a estrutura acima e retorne um objeto JSON com exatamente estes campos:
{
  "documentation": string (documentação completa em markdown pronta para colar no Outline),
  "inferredModule": string (módulo do sistema identificado),
  "extractedFields": array de objetos com { "fieldName": string, "tableName": string, "module": string, "description": string, "fieldType": string },
  "wikiKeywords": array de strings (3-5 palavras-chave para buscar na wiki)
}`;

    const result = await callGeminiJson<GenerateResult>(prompt);

    const wikiKeywords = result.wikiKeywords ?? [module ?? "documentacao"];
    const wikiQuery = wikiKeywords.slice(0, 3).join(" ");
    const wikiMatches = await searchWiki(wikiQuery);

    res.json({
      documentation: result.documentation ?? "",
      inferredModule: result.inferredModule ?? module ?? "Não identificado",
      extractedFields: result.extractedFields ?? [],
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
