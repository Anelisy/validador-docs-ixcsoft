/**
 * Mock validation service para funcionar offline no GitHub Pages
 */

export interface MockValidationResult {
  score: number;
  extractedFields: Array<{ name: string; type: string; description: string }>;
  formattedDoc: string;
  issues: Array<{ severity: "error" | "warning" | "info"; message: string }>;
  savedFieldsCount?: number;
}

export interface MockGenerationResult {
  documentation: string;
  extractedFields: Array<{ name: string; type: string; description: string }>;
  inferredModule: string;
  savedFieldsCount?: number;
}

const fieldPatterns = [
  { regex: /endpoint|url|uri/i, type: "string", description: "Endpoint de API" },
  { regex: /method|http|get|post|put|delete|patch/i, type: "string", description: "Método HTTP" },
  { regex: /parameter|param|args?|argument/i, type: "object", description: "Parâmetros" },
  { regex: /response|return|result/i, type: "object", description: "Resposta" },
  { regex: /error|exception|fail/i, type: "object", description: "Tratamento de Erro" },
  { regex: /authentication|auth|token|bearer/i, type: "string", description: "Autenticação" },
  { regex: /rate.?limit|throttle/i, type: "number", description: "Rate Limit" },
  { regex: /timeout|deadline/i, type: "string", description: "Timeout" },
];

export function mockValidateDoc(documentation: string, module?: string): MockValidationResult {
  const lines = documentation.split("\n").filter(l => l.trim());
  
  // Extrai campos potenciais
  const extractedFields: Array<{ name: string; type: string; description: string }> = [];
  const seenNames = new Set<string>();

  for (const line of lines) {
    for (const pattern of fieldPatterns) {
      if (pattern.regex.test(line)) {
        const name = line.substring(0, 50).trim().replace(/[^\w\s]/g, "");
        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          extractedFields.push({
            name: name.substring(0, 20),
            type: pattern.type,
            description: pattern.description,
          });
        }
      }
    }
  }

  // Calcula score
  let score = 50;
  if (lines.length > 3) score += 10;
  if (extractedFields.length > 0) score += 20;
  if (documentation.length > 200) score += 10;
  if (/^#+\s/.test(documentation)) score += 10;
  if (/```/.test(documentation)) score += 10;
  
  score = Math.min(100, score);

  // Gera resultado formatado
  const formattedDoc = `# ${module || "Módulo"}\n\n${documentation}\n\n## Campos Extraídos\n${extractedFields
    .map((f) => `- **${f.name}** (${f.type}): ${f.description}`)
    .join("\n")}`;

  // Gera issues
  const issues = [];
  if (lines.length < 3) issues.push({ severity: "warning" as const, message: "Documentação muito curta" });
  if (!documentation.includes("#")) issues.push({ severity: "info" as const, message: "Considere adicionar títulos com #" });
  if (extractedFields.length === 0) issues.push({ severity: "warning" as const, message: "Nenhum campo identificado automaticamente" });

  return {
    score,
    extractedFields: extractedFields.slice(0, 10),
    formattedDoc,
    issues,
    savedFieldsCount: extractedFields.length,
  };
}

export function mockGenerateDoc(cardContent: string, module?: string): MockGenerationResult {
  const lines = cardContent.split("\n").filter(l => l.trim());
  
  // Extrai informações do card
  const extractedFields: Array<{ name: string; type: string; description: string }> = [];
  const seenNames = new Set<string>();

  for (const line of lines) {
    for (const pattern of fieldPatterns) {
      if (pattern.regex.test(line)) {
        const name = line.substring(0, 50).trim().replace(/[^\w\s]/g, "");
        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          extractedFields.push({
            name: name.substring(0, 20),
            type: pattern.type,
            description: pattern.description,
          });
        }
      }
    }
  }

  // Gera documentação
  const documentation = `# ${module || "Documentação Gerada"}

## Conteúdo Original
${cardContent}

## Campos Identificados
${extractedFields.map((f) => `- **${f.name}** (${f.type}): ${f.description}`).join("\n")}

## Notas
Esta é uma documentação gerada automaticamente baseada no conteúdo do card. 
Revise e aperfeiçoe conforme necessário.
`;

  return {
    documentation,
    extractedFields: extractedFields.slice(0, 10),
    inferredModule: module || "Genérico",
    savedFieldsCount: extractedFields.length,
  };
}
