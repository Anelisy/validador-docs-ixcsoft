import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";
const HF_API_KEY = "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";

const TEMPLATES = {
  GERAL: `Título
📍 Localização
📝 Descrição
✅ Passos
💡 Dicas
⚠️ Atenção
🔗 Links relacionados`,
  TUTORIAL: `📚 TUTORIAL
🎯 Objetivo
📋 Pré-requisitos
📝 Passo a passo
💡 Dicas importantes
❓ Possíveis erros`,
  REFERENCIA: `📖 REFERÊNCIA RÁPIDA
🔍 O quê?
🎯 Para quê?
📋 Como usar?
⚙️ Parâmetros/Configurações
💡 Exemplos
🔗 Veja também`,
  FAQ: `❓ PERGUNTAS FREQUENTES
📋 Lista de perguntas com respostas concisas
🔗 Links para documentação completa`
};

const SKILLS = {
  "Vitepress": "Você é especialista em VitePress, framework de documentação Vue.js. Use containers: [!NOTE], [!TIP], [!WARNING], [!SUCCESS], [!INFO]. Preserve a sintaxe exata.",
  "API": "Você é especialista em documentação de APIs REST. Use formatação para endpoints, métodos HTTP, parâmetros, headers, exemplos de requisição/resposta.",
  "Suporte": "Você é especialista em documentação para suporte técnico. Foco em clareza, solução de problemas comuns, linguagem acessível.",
  "Técnico": "Você é especialista em documentação técnica avançada. Use terminologia precisa, diagramas em ASCII quando útil, referências cruzadas."
};

export default function ValidatorPageStandalone() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [operationType, setOperationType] = useState("validar");
  const [template, setTemplate] = useState("GERAL");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [inputText]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const callGemini = async () => {
    if (!inputText) {
      setError("Por favor, insira o texto para processar.");
      return;
    }
    
    if (!API_KEY) {
      setError("API Key do Gemini não configurada. Configure VITE_GEMINI_API_KEY no ambiente.");
      return;
    }

    setLoading(true);
    setError("");
    setOutputText("Processando...");
    
    let systemPrompt = "";

    if (operationType === "validar") {
      systemPrompt = `Você é um Analista de Documentação Técnica da IXCsoft, especialista em validar documentações.

FONTES DE PESQUISA E COMPARAÇÃO:
- Central IXC Provedor: https://central.ixcprovedor.com.br
- Central IXC ACS: https://central-ixcacs.ixcsoft.com.br
- Wiki ERP: https://wiki-erp.ixcsoft.com.br

FORMATO DE SAÍDA OBRIGATÓRIO:
📋 ANÁLISE DE CONFORMIDADE
📍 ONDE ALTERAR
🔗 LINKS DE REFERÊNCIA
💡 SUGESTÕES DE MELHORIA
❓ PERGUNTAS FAQ (5 a 10, sem respostas)

Template base: ${TEMPLATES[template]}
${selectedSkill ? `SKILL ESPECÍFICA: ${SKILLS[selectedSkill]}` : ""}

IMPORTANTE: Não invente informações. Se não tiver certeza sobre algo, indique claramente. Use emojis e formatação markdown.`;
    } else {
      systemPrompt = `Você é um Gerador de Documentação Técnica IXCsoft especialista em criar documentações de alta qualidade.

REGRAS OBRIGATÓRIAS:
- Não invente seções desnecessárias
- Preserve containers VitePress: [!NOTE] ✏️ [!TIP] 🔥 [!WARNING] ⚠️ [!SUCCESS] ✅ [!INFO] ℹ️
- Use emojis para melhor visualização
- Crie tabelas quando apropriado
- Adicione exemplos práticos
- Mantenha consistência na terminologia

Template a seguir: ${TEMPLATES[template]}
${selectedSkill ? `SKILL ESPECÍFICA: ${SKILLS[selectedSkill]}` : ""}

Crie documentação clara, precisa e acionável.`;
    }

    let resultText = "";
    let usedModel = "Gemini";

    try {
      // TENTATIVA PRINCIPAL: Gemini
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemPrompt}\n\nTEXTO DO USUÁRIO:\n${inputText}` }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
          }),
        }
      );

      if (geminiRes.ok) {
        const data = await geminiRes.json();
        resultText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (!resultText) {
          throw new Error("Resposta vazia da API Gemini");
        }
      } else if (geminiRes.status === 429) {
        // FALLBACK 1: Hugging Face (quando Gemini está sobrecarregado)
        setOutputText("⚠️ Gemini temporariamente indisponível. Usando fallback Hugging Face...");
        usedModel = "HuggingFace (fallback)";

        try {
          const hfRes = await fetch(
            "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                inputs: `<s>[INST] ${systemPrompt}\n\nTEXTO DO USUÁRIO:\n${inputText} [/INST]`,
                parameters: {
                  max_new_tokens: 2048,
                  temperature: 0.7,
                  do_sample: true,
                },
              }),
            }
          );

          const hfData = await hfRes.json();
          
          if (hfRes.ok) {
            if (Array.isArray(hfData) && hfData[0]?.generated_text) {
              resultText = hfData[0].generated_text.split("[/INST]")[1]?.trim() || hfData[0].generated_text;
            } else if (hfData.generated_text) {
              resultText = hfData.generated_text.split("[/INST]")[1]?.trim() || hfData.generated_text;
            } else {
              resultText = JSON.stringify(hfData);
            }
          } else {
            throw new Error(hfData.error || "Erro desconhecido no Hugging Face");
          }
        } catch (hfError) {
          console.error("Erro Hugging Face:", hfError);
          throw new Error(`Fallback falhou: ${hfError.message}`);
        }
      } else {
        // Outros erros do Gemini
        const errorData = await geminiRes.json().catch(() => ({}));
        throw new Error(`Gemini API erro ${geminiRes.status}: ${errorData.error?.message || "Erro desconhecido"}`);
      }

      if (!resultText || resultText.trim() === "") {
        throw new Error("Não foi possível gerar uma resposta válida");
      }

      // Adiciona informação do modelo usado
      const modelInfo = `\n\n---\n✨ **Gerado usando:** ${usedModel}\n🕒 ${new Date().toLocaleString('pt-BR')}`;
      setOutputText(resultText + modelInfo);
      
    } catch (err) {
      console.error("Erro detalhado:", err);
      let errorMessage = "❌ Erro ao processar solicitação.\n\n";
      
      if (err.message.includes("429")) {
        errorMessage += "API Gemini está sobrecarregada. Tente novamente em alguns instantes.\n";
        errorMessage += "Dica: Use o fallback manualmente selecionando 'Hugging Face' se disponível.";
      } else if (err.message.includes("API key")) {
        errorMessage += "Erro de autenticação. Verifique a chave de API do Gemini.\n";
        errorMessage += "Configure VITE_GEMINI_API_KEY corretamente no ambiente.";
      } else if (err.message.includes("network") || err.message.includes("fetch")) {
        errorMessage += "Erro de rede. Verifique sua conexão com a internet.\n";
        errorMessage += "Tente novamente em alguns instantes.";
      } else {
        errorMessage += err.message || "Erro desconhecido. Tente novamente mais tarde.";
      }
      
      setError(errorMessage);
      setOutputText(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = () => {
    if (!outputText || outputText.includes("❌") || outputText.includes("Processando")) {
      setError("Nada para copiar. Aguarde o processamento terminar.");
      return;
    }
    
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied(true);
      setError("");
    }).catch(() => {
      setError("Não foi possível copiar para área de transferência");
    });
  };

  const clearAll = () => {
    setInputText("");
    setOutputText("");
    setError("");
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📄 IXCsoft Document Validator
          </h1>
          <p className="text-gray-600">
            Valide e gere documentação técnica usando IA (Gemini + Fallback Hugging Face)
          </p>
          {!API_KEY && (
            <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
              ⚠️ VITE_GEMINI_API_KEY não configurada. Configure no arquivo .env
            </div>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">📝 Entrada</h2>
              <button
                onClick={clearAll}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition"
              >
                Limpar tudo
              </button>
            </div>

            {/* Controls */}
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operação
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOperationType("validar")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                      operationType === "validar"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    🔍 Validar
                  </button>
                  <button
                    onClick={() => setOperationType("gerar")}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                      operationType === "gerar"
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    ✨ Gerar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template
                </label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="GERAL">Geral</option>
                  <option value="TUTORIAL">Tutorial</option>
                  <option value="REFERENCIA">Referência Rápida</option>
                  <option value="FAQ">FAQ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skill Específica (opcional)
                </label>
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Nenhuma</option>
                  <option value="Vitepress">VitePress</option>
                  <option value="API">API REST</option>
                  <option value="Suporte">Suporte Técnico</option>
                  <option value="Técnico">Documentação Técnica</option>
                </select>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Cole aqui o texto da documentação para validar ou o conteúdo para gerar documentação..."
              className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
            />

            {/* Action Buttons */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={callGemini}
                disabled={loading || !inputText}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition transform hover:scale-105 disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processando...
                  </span>
                ) : (
                  `🚀 ${operationType === "validar" ? "Validar" : "Gerar"} Documentação`
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Output Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">✨ Resultado</h2>
              <button
                onClick={copyOutput}
                disabled={!outputText || outputText.includes("Processando")}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded transition flex items-center gap-2"
              >
                {copied ? "✓ Copiado!" : "📋 Copiar"}
              </button>
            </div>

            <div className="h-[600px] overflow-y-auto">
              {outputText ? (
                <pre className="whitespace-pre-wrap font-sans text-gray-800 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {outputText}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📄</div>
                    <p>O resultado aparecerá aqui</p>
                    <p className="text-sm mt-2">Insira um texto e clique em Validar ou Gerar</p>
                  </div>
                </div>
              )}
            </div>

            {/* Info Footer */}
            <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
              <div className="flex justify-between items-center">
                <span>🔒 Processamento local via API Gemini + Fallback Hugging Face</span>
                <span>⚡ Respostas em tempo real</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}