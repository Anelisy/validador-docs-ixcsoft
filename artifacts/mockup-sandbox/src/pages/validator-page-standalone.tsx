import React, { useState, useEffect } from "react";
import {
  Search,
  Bot,
  MessageSquare,
  History,
  User,
  Plus,
  Trash2,
  Copy,
  Menu,
  X,
  LogOut,
  Sparkles,
  Layout,
  Database,
  Check,
  ExternalLink,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";
const DEEPSEEK_API_KEY = "sk-a4ed848af1e047858a59692ddd81efa6";
const HF_API_KEY = "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";

const TEMPLATES = {
  GERAL: `Título
Introdução
(Forneça uma breve introdução ao tema do artigo, destacando sua relevância e contexto geral. Explique por que esse assunto é importante para o leitor e o que ele pode esperar aprender ao longo do texto).

Desenvolvimento (mudar esse título conforme a documentação)
(Explane o assunto em detalhes. Divida esta seção em sub-seções conforme necessário para cobrir diferentes aspectos ou tópicos relacionados ao tema principal do artigo. Considere a inclusão de tabelas ou diagramas que possam enriquecer o texto).

SUBTÓPICO A
(Explique este subtópico em profundidade. Forneça definições, contextos históricos, ou debates atuais).

SUBTÓPICO B
(Explique este subtópico em profundidade. Discuta diferentes teorias, práticas ou aplicações associadas).

CONSIDERAÇÕES FINAIS
(Resuma os principais pontos discutidos no artigo. Reitere a importância do tema e sugira possíveis direções futuras ou aplicações práticas relacionadas ao conteúdo apresentado).

Leia também
(Destaque links para outros artigos ou documentos da central de ajuda que possuam relação ou extensão direta com o tema tratado).`,
  CADASTRO: `Cadastro de X
Introdução
Visão geral do cadastro. Objetivo e escopo do cadastro. Adicione aqui uma contextualização do assunto, detalhando brevemente a importância e a funcionalidade.

[!NOTE] Acesso ao formulário
Caminho: Menu > item > formulário.

Entrega de valor
Quais benefícios essa configuração/parametrização entrega aos clientes?

Estrutura do formulário
Abas principais e informações integradas a outros módulos.

Campo | Descrição
--- | ---
Financeiro | Financeiro gerado para o cliente
Ordem de serviço | Ordens de serviço do cliente

Casos de Uso
Como o usuário poderá usar essa funcionalidade no dia a dia, em qual cenário?

Considerações finais
Resumo do que foi descrito em toda a documentação do formulário.

Leia também
Links adicionais da central de ajuda.`,
  HOMOLOGACAO: `---
title:
publicado: false
revisado: false
melhoria: false
autor:
revisor:
data_revisão:

Modelo // substituir pelo Nome do modelo do equipamento.

Introdução
Modelo é um dispositivo fabricado pela/por Fabricante, projetado para oferecer funcionalidades essenciais. Este documento detalha as capacidades e limitações do dispositivo conforme testado no IXC ACS.

[!INFO] Importante
Firmware homologado:
Hardware homologado:
DataModel:

// Preencher apenas com: Sim, Não ou requer verificação.
Funcionalidade | Gerenciável via IXC ACS | Observações
--- | --- | ---
NTP | |
Wi-Fi | |

[!NOTE] Acesso à funcionalidade

Caminho: Menu Ferramentas > Pré Configuração do dispositivo.

Considerações Finais
Um breve resumo sobre tudo o que foi discutido.

Leia Também
Comparativo Homologações
Guia - Termos de Homologação de Dispositivos`,
};

type Skill = {
  id: number;
  name: string;
  prompt: string;
  category: "GERAL" | "CADASTRO" | "HOMOLOGACAO";
};

type HistoryItem = {
  id: number;
  input: string;
  output: string;
  type: string;
  date: string;
};

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Layout },
  { id: "history", label: "Histórico", icon: History },
  { id: "skills", label: "Personalização", icon: Sparkles },
  { id: "user", label: "Usuário", icon: User },
] as const;

type TabId = (typeof NAV_ITEMS)[number]["id"];

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  collapsed,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
          : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
      }`}
    >
      <div className="shrink-0">
        <Icon size={20} />
      </div>
      {!collapsed && (
        <span className="font-bold text-xs tracking-wide">{label}</span>
      )}
    </button>
  );
}

export default function ValidatorPageStandalone() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [operationType, setOperationType] = useState("validar");
  const [template, setTemplate] = useState<keyof typeof TEMPLATES>("GERAL");

  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState("");

  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const savedHistory = localStorage.getItem("ixc_history");
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedSkills = localStorage.getItem("ixc_skills");
    if (savedSkills) setSkills(JSON.parse(savedSkills));
  }, []);

  useEffect(() => {
    localStorage.setItem("ixc_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("ixc_skills", JSON.stringify(skills));
  }, [skills]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const callGemini = async () => {
    if (!inputText) return;
    if (!API_KEY) {
      alert("Chave da API do Gemini não configurada.");
      return;
    }

    setLoading(true);
    setOutputText("Processando...");

    let systemPrompt = "";

    if (operationType === "validar") {
      systemPrompt = `Você é um Analista de Documentação Técnica da IXCsoft, especialista em validar documentações para a Central de Ajuda (VitePress).

FONTES DE PESQUISA E COMPARAÇÃO:
- Central IXC Provedor: https://central.ixcprovedor.com.br
- Central IXC ACS: https://central-ixcacs.ixcsoft.com.br
- Wiki ERP: https://wiki-erp.ixcsoft.com.br

INSTRUÇÕES DE SAÍDA:
📋 ANÁLISE DE CONFORMIDADE:
📍 ONDE ALTERAR:
🔗 LINKS DE REFERÊNCIA:
💡 SUGESTÕES DE MELHORIA:
❓ PERGUNTAS FAQ (5 a 10): (sem respostas)

Template: ${TEMPLATES[template]}
${selectedSkill ? `SKILL: ${selectedSkill}` : ""}`;
    } else {
      systemPrompt = `Você é um Gerador de Documentação Técnica IXCsoft para VitePress.

REGRAS: Não invente seções, preserve containers VitePress, use emojis e tabelas.
CONTAINERS: [!NOTE] ✏️ [!TIP] 🔥 [!WARNING] ⚠️ [!SUCCESS] ✅ [!INFO] ℹ️

Template: ${TEMPLATES[template]}
${selectedSkill ? `SKILL: ${selectedSkill}` : ""}`;
    }

    let resultText = "";
    let usedModel = "";

    try {
      // 1ª TENTATIVA: Gemini
      usedModel = "Gemini";
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nTEXTO DO USUÁRIO:\n${inputText}` }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
          }),
        }
      );

      if (geminiResponse.ok) {
        const data = await geminiResponse.json();
        resultText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      } else if (geminiResponse.status === 429) {
        // 2ª TENTATIVA: DeepSeek (fallback 1)
        setOutputText("⚠️ Gemini indisponível. Usando DeepSeek como fallback...");
        usedModel = "DeepSeek (fallback 1)";
        
        const deepseekResponse = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: inputText },
            ],
            temperature: 0.7,
            max_tokens: 4096,
          }),
        });

        const dsData = await deepseekResponse.json();
        if (deepseekResponse.ok) {
          resultText = dsData.choices?.[0]?.message?.content ?? "";
        } else {
          throw new Error(`DeepSeek: ${dsData.error?.message || "Erro desconhecido"}`);
        }
      } else {
        throw new Error(`Gemini erro ${geminiResponse.status}`);
      }

      // Se Gemini e DeepSeek falharem ou retornarem vazio, tenta Hugging Face
      if (!resultText || resultText.trim() === "") {
        // 3ª TENTATIVA: Hugging Face (fallback 2)
        setOutputText("⚠️ DeepSeek indisponível. Usando Hugging Face como fallback...");
        usedModel = "HuggingFace (fallback 2)";
        
        const hfResponse = await fetch(
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
              },
            }),
          }
        );

        const hfData = await hfResponse.json();
        if (hfResponse.ok) {
          if (Array.isArray(hfData) && hfData[0]?.generated_text) {
            resultText = hfData[0].generated_text.split("[/INST]")[1]?.trim() || hfData[0].generated_text;
          } else if (hfData.generated_text) {
            resultText = hfData.generated_text.split("[/INST]")[1]?.trim() || hfData.generated_text;
          } else {
            resultText = JSON.stringify(hfData);
          }
        } else {
          throw new Error(`Hugging Face: ${hfData.error || "Erro desconhecido"}`);
        }
      }

      if (!resultText || resultText.trim() === "") {
        throw new Error("Todos os serviços falharam. Tente novamente mais tarde.");
      }

      const finalOutput = `✨ **Gerado por:** ${usedModel}\n\n${resultText}\n\n---\n🕒 ${new Date().toLocaleString('pt-BR')}`;
      setOutputText(finalOutput);

      setHistory((prev) => {
        const newHistory = [
          { 
            id: Date.now(), 
            input: inputText, 
            output: `[${usedModel}] ${resultText.substring(0, 500)}...`, 
            type: operationType, 
            date: new Date().toLocaleString() 
          },
          ...prev,
        ];
        return newHistory.slice(0, 50);
      });
    } catch (error: any) {
      console.error(error);
      setOutputText(`❌ Erro: ${error.message || "Falha na comunicação com as APIs"}`);
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
  };

  const displayName = user?.name ?? "Usuário";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-200">
      {copied && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <Check size={18} />
          <span className="font-bold text-sm">Copiado!</span>
        </div>
      )}

      <aside className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white"><Database size={24} /></div>
          {sidebarOpen && <span className="font-bold text-white text-lg">Validador IXC</span>}
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon }) => (
            <NavItem key={id} icon={icon} label={label} active={activeTab === id} onClick={() => setActiveTab(id)} collapsed={!sidebarOpen} />
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button type="button" onClick={logout} className="flex items-center gap-3 px-3 py-2 w-full hover:bg-red-500/10 hover:text-red-400 rounded-lg transition">
            <LogOut size={18} />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 md:h-16 bg-slate-900 border-b border-slate-800 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:flex p-2 hover:bg-slate-800 rounded-lg"><Menu size={20} /></button>
            <h2 className="hidden md:block font-semibold capitalize">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white">{displayName}</p>
              <p className="text-[10px] text-slate-400">{user?.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">{displayName.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === "home" && (
            <div className="flex flex-col gap-5">
              {operationType === "validar" && (
                <div className="bg-blue-600/5 border border-blue-600/20 rounded-xl p-3 flex items-center gap-2">
                  <ExternalLink size={14} className="text-blue-400 shrink-0" />
                  <p className="text-xs text-blue-400">
                    <strong>Fontes de pesquisa:</strong> Central IXC Provedor, Central IXC ACS, Wiki ERP
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button type="button" onClick={() => setOperationType("validar")} className={`px-5 py-2 rounded-lg text-xs font-bold ${operationType === "validar" ? "bg-blue-600 text-white" : "text-slate-400"}`}>VALIDAR</button>
                  <button type="button" onClick={() => setOperationType("gerar")} className={`px-5 py-2 rounded-lg text-xs font-bold ${operationType === "gerar" ? "bg-blue-600 text-white" : "text-slate-400"}`}>GERAR</button>
                </div>
                <select value={template} onChange={(e) => setTemplate(e.target.value as keyof typeof TEMPLATES)} className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-300">
                  <option value="GERAL">Template: Geral</option>
                  <option value="CADASTRO">Template: Cadastro</option>
                  <option value="HOMOLOGACAO">Template: Homologação</option>
                </select>
                <select value={selectedSkill} onChange={(e) => setSelectedSkill(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-300">
                  <option value="">Sem skill específica</option>
                  {skills.map((skill) => (<option key={skill.id} value={skill.prompt}>{skill.name} ({skill.category})</option>))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><MessageSquare size={14} />Campo de Input</label>
                    <button type="button" onClick={() => setInputText("")} className="p-1 text-slate-600 hover:text-red-500"><X size={16} /></button>
                  </div>
                  <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Cole aqui seu texto... ✅ 📝 📊" className="flex-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm resize-none outline-none min-h-[200px]" />
                  <button type="button" onClick={callGemini} disabled={loading || !inputText} className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3">
                    {loading ? (<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />) : (<><Bot size={18} />{operationType === "validar" ? "VALIDAR INFORMAÇÃO" : "GERAR DOCUMENTAÇÃO"}</>)}
                  </button>
                </div>

                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Bot size={14} />
                      Resultado
                      {loading && <span className="text-blue-400 animate-pulse ml-2">● Processando...</span>}
                    </label>
                    <button type="button" onClick={copyOutput} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs transition"><Copy size={14} />COPIAR</button>
                  </div>
                  <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-4 whitespace-pre-wrap text-sm overflow-y-auto min-h-[200px]">
                    {outputText || (loading ? "Processando..." : "Aguardando solicitação...")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Histórico de Gerações</h3>
                {history.length > 0 && (
                  <button type="button" onClick={() => { if (confirm("Limpar tudo?")) setHistory([]); }} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-bold transition"><Trash2 size={14} />LIMPAR TUDO</button>
                )}
              </div>
              {history.length === 0 && (
                <div className="text-center py-12 text-slate-600"><History size={48} className="mx-auto mb-4 opacity-50" /><p>Nenhum histórico ainda.</p></div>
              )}
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${item.type === "validar" ? "bg-blue-600/20 text-blue-400" : "bg-green-600/20 text-green-400"}`}>{item.type === "validar" ? "Validação" : "Geração"}</span>
                        <span className="text-xs text-slate-500">{item.date}</span>
                      </div>
                      <button type="button" onClick={() => { setInputText(item.input); setOutputText(item.output); setOperationType(item.type); setActiveTab("home"); }} className="text-xs text-blue-400 hover:text-blue-300 transition">Reutilizar</button>
                    </div>
                    <details className="group"><summary className="text-sm font-bold text-white cursor-pointer hover:text-blue-400 transition">Input</summary><div className="mt-2 p-3 bg-slate-800 rounded-lg text-xs text-slate-400 whitespace-pre-wrap max-h-32 overflow-y-auto">{item.input}</div></details>
                    <details className="group mt-2"><summary className="text-sm font-bold text-white cursor-pointer hover:text-blue-400 transition">Output</summary><div className="mt-2 p-3 bg-slate-800 rounded-lg text-xs text-slate-400 whitespace-pre-wrap max-h-48 overflow-y-auto">{item.output}</div></details>
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={() => { navigator.clipboard.writeText(item.output); setCopied(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs transition"><Copy size={12} />Copiar</button>
                      <button type="button" onClick={() => setHistory((prev) => prev.filter((h) => h.id !== item.id))} className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition"><Trash2 size={12} />Remover</button>
                    </div>
                  </div>
                ))}
              </div>
              {history.length > 0 && <p className="text-center text-xs text-slate-600">Mostrando {history.length} registro(s) • Limitado a 50</p>}
            </div>
          )}

          {activeTab === "skills" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                <h4 className="font-bold text-white mb-4">{editingSkill ? "Editar Skill" : "Nova Skill"}</h4>
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); const name = String(fd.get("skill_name") || ""); const prompt = String(fd.get("skill_prompt") || ""); const category = String(fd.get("skill_category") || "GERAL") as Skill["category"]; if (!name || !prompt) return; if (editingSkill) { setSkills(skills.map((s) => s.id === editingSkill.id ? { ...s, name, prompt, category } : s)); setEditingSkill(null); } else { setSkills([...skills, { id: Date.now(), name, prompt, category }]); } e.currentTarget.reset(); }} className="space-y-3">
                  <input name="skill_name" placeholder="Nome da skill" defaultValue={editingSkill?.name ?? ""} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3" />
                  <select name="skill_category" defaultValue={editingSkill?.category ?? "GERAL"} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3"><option value="GERAL">Geral</option><option value="CADASTRO">Cadastro</option><option value="HOMOLOGACAO">Homologação</option></select>
                  <textarea name="skill_prompt" placeholder="Prompt da skill" defaultValue={editingSkill?.prompt ?? ""} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 min-h-[120px]" />
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">{editingSkill ? "SALVAR" : "ADICIONAR SKILL"}</button>
                </form>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {skills.map((s) => (
                  <div key={s.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2 mb-3"><Bot size={16} /><p className="font-bold text-white">{s.name}</p></div>
                    <p className="text-xs text-slate-400 mb-4">{s.prompt}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingSkill(s)} className="flex-1 text-blue-400 hover:bg-blue-500/10 py-2 rounded-lg transition text-xs font-bold">EDITAR</button>
                      <button type="button" onClick={() => setSkills((prev) => prev.filter((sk) => sk.id !== s.id))} className="flex-1 text-red-500 hover:bg-red-500/10 py-2 rounded-lg transition text-xs font-bold flex items-center justify-center gap-1"><Trash2 size={12} />REMOVER</button>
                    </div>
                  </div>
                ))}
              </div>
              {skills.length === 0 && <div className="text-center py-12 text-slate-600">Nenhuma skill cadastrada.</div>}
            </div>
          )}

          {activeTab === "user" && (
            <div className="max-w-lg mx-auto space-y-6">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-lg font-bold text-white mb-6">Perfil do Usuário</h3>
                <div className="space-y-4">
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome</label><div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white">{displayName}</div></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">E-mail</label><div className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white">{user?.email}</div></div>
                  <div className="border-t border-slate-800 pt-4">
                    <h4 className="text-sm font-bold text-white mb-3">Alterar Senha</h4>
                    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); const np = String(fd.get("new_password") || ""); const cp = String(fd.get("confirm_password") || ""); if (!np || np.length < 6) { alert("Mínimo 6 caracteres."); return; } if (np !== cp) { alert("Senhas não coincidem."); return; } const { changePassword } = useAuth(); changePassword(np); (e.target as HTMLFormElement).reset(); }} className="space-y-3">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nova Senha</label><input type="password" name="new_password" placeholder="Mínimo 6 caracteres" required minLength={6} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 transition" /></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Confirmar Senha</label><input type="password" name="confirm_password" placeholder="Repita a nova senha" required minLength={6} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 outline-none focus:border-blue-500 transition" /></div>
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition">ALTERAR SENHA</button>
                    </form>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <button type="button" onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl font-bold transition"><LogOut size={18} />SAIR DA CONTA</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}