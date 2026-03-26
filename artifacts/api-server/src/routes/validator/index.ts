import { Router, type IRouter } from "express";
import { ValidateDocBody, GenerateDocBody, WikiSearchBody } from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import { db } from "@workspace/db";
import { fieldsTable } from "@workspace/db/schema";

const router: IRouter = Router();

const SKILL_PROMPT = `
Você é um especialista em documentação técnica para sistemas ERP. Seu papel é transformar insumos técnicos em documentação semântica, detalhada e reutilizável, pronta para colar no Outline.

## Regras de comportamento
- Inferir o módulo quando ele não vier explicitamente informado e declarar a inferência.
- Não inventar nomes de tabelas, funções, endpoints, campos ou integrações. Quando o insumo não trouxer evidência suficiente, usar "não informado", "não especificado" ou "inferência".
- Priorizar explicação de regra de negócio e impacto sistêmico antes de repetir o texto do card.
- Traduzir linguagem de desenvolvimento para linguagem de documentação técnica sem perder precisão.
- Manter tom profissional, técnico e descritivo (o texto será consumido por IA futuramente).
- Entregar texto pronto para colar no Outline, sem prefácio conversacional e sem metacomentários.

## Estrutura obrigatória da saída ao GERAR documentação

Sempre gerar, nesta ordem:
1. Contexto do módulo
2. Objetivo de negócio
3. Mapeamento de regras de negócio
4. Dicionário de interface e campos
5. Análise de impacto (developer view)
6. Histórico de mudança
7. Integrações e apis
8. Critérios de atenção, riscos e validações

## Dicionário de interface e campos
Usar tabela com as colunas exatas:
- Nome do campo
- Tipo (Texto, Data, Número, Booleano, Seleção, Arquivo, Tabela, Oculto, Não informado)
- Descrição
- Regra/Opções

## Extração de campos
Sempre identificar e extrair campos de API/interface mencionados no texto, informando:
- fieldName: nome técnico do campo
- tableName: tabela ou entidade a que pertence (inferir se não informado)
- module: módulo do sistema
- description: descrição descritiva do campo para consumo por IA
- fieldType: Texto, Data, Número, Booleano, Seleção, Arquivo, Tabela, Oculto
`;

const WIKI_BASE_URL = "https://wiki-erp.ixcsoft.com.br/documentacao/";

async function searchWiki(query: string): Promise<Array<{title: string, url: string, relevance: string, action: string}>> {
  try {
    const searchUrl = `${WIKI_BASE_URL}?search=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "DocValidator/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const matches: Array<{title: string, url: string, relevance: string, action: string}> = [];
    const linkRegex = /<a[^>]+href="([^"]*documentacao[^"]*)"[^>]*>([^<]{5,100})<\/a>/gi;
    let match;
    let count = 0;
    while ((match = linkRegex.exec(html)) !== null && count < 10) {
      const href = match[1];
      const title = match[2].trim().replace(/\s+/g, " ");
      if (title.length > 5 && !title.includes("javascript") && href.startsWith("http")) {
        const queryLower = query.toLowerCase();
        const titleLower = title.toLowerCase();
        const relevance = titleLower.includes(queryLower) || queryLower.split(" ").some(w => titleLower.includes(w))
          ? "high"
          : "medium";
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

router.post("/validate", async (req, res) => {
  const parsed = ValidateDocBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Corpo inválido", details: parsed.error });
    return;
  }
  const { documentation, module } = parsed.data;

  const prompt = `${SKILL_PROMPT}

## Tarefa: VALIDAR documentação existente

Módulo informado: ${module ?? "não informado"}

Documentação a validar:
---
${documentation}
---

Analise esta documentação e retorne um JSON com a seguinte estrutura (apenas o JSON, sem markdown):
{
  "isValid": boolean,
  "score": number (0-100, qualidade geral da documentação),
  "inferredModule": string,
  "suggestions": [
    {
      "type": "error" | "warning" | "info",
      "section": "nome da seção",
      "message": "descrição do problema",
      "suggestion": "como corrigir"
    }
  ],
  "missingFields": ["seções ou campos ausentes"],
  "extractedFields": [
    {
      "fieldName": "nome_campo",
      "tableName": "nome_tabela",
      "module": "modulo",
      "description": "descrição descritiva para IA",
      "fieldType": "Texto|Data|Número|Booleano|Seleção|Arquivo|Tabela|Oculto|Não informado"
    }
  ],
  "wikiKeywords": ["palavras-chave para buscar na wiki"],
  "formattedDoc": "documentação reformatada seguindo o template padrão"
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192 },
    });

    const rawText = response.text ?? "{}";
    const cleanJson = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleanJson);

    const wikiKeywords = result.wikiKeywords ?? [module ?? "documentacao"];
    const wikiQuery = wikiKeywords.slice(0, 3).join(" ");
    const wikiMatches = await searchWiki(wikiQuery);

    res.json({
      isValid: result.isValid ?? false,
      score: result.score ?? 0,
      suggestions: result.suggestions ?? [],
      missingFields: result.missingFields ?? [],
      wikiMatches,
      extractedFields: result.extractedFields ?? [],
      formattedDoc: result.formattedDoc ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Error validating doc");
    res.status(500).json({ error: "Erro ao validar documentação" });
  }
});

router.post("/generate", async (req, res) => {
  const parsed = GenerateDocBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Corpo inválido", details: parsed.error });
    return;
  }
  const { cardContent, module } = parsed.data;

  const prompt = `${SKILL_PROMPT}

## Tarefa: GERAR documentação a partir de card do Jira

Módulo informado: ${module ?? "não informado (infira a partir do conteúdo)"}

Conteúdo do card/resolução do dev:
---
${cardContent}
---

Gere a documentação completa seguindo a estrutura obrigatória e retorne um JSON (apenas JSON, sem markdown):
{
  "documentation": "documentação completa em markdown pronta para colar no Outline",
  "inferredModule": "módulo inferido",
  "extractedFields": [
    {
      "fieldName": "nome_campo",
      "tableName": "nome_tabela",
      "module": "modulo",
      "description": "descrição descritiva para IA",
      "fieldType": "Texto|Data|Número|Booleano|Seleção|Arquivo|Tabela|Oculto|Não informado"
    }
  ],
  "wikiKeywords": ["palavras-chave para buscar na wiki"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192 },
    });

    const rawText = response.text ?? "{}";
    const cleanJson = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleanJson);

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
    res.status(500).json({ error: "Erro ao gerar documentação" });
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
