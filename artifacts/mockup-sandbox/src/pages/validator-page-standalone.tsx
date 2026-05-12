import { useState, useEffect } from "react";
import {
  Search, Bot, MessageSquare, History, User, Plus, Trash2,
  Copy, Menu, X, LogOut, Sparkles, Layout, Database, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const API_KEY = "";

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
---
Modelo
Introdução
Modelo é um dispositivo fabricado pela/por Fabricante, projetado para oferecer funcionalidades essenciais. Este documento detalha as capacidades e limitações do dispositivo conforme testado no IXC ACS.

[!INFO] Importante
Firmware homologado: 
Hardware homologado: 
DataModel: 

Legenda: ✅ Disponível | ❌ Indisponível | ❓ Requer verificação | ❕ Parcial

Funcionalidade | Gerenciável via IXC ACS | Observações
--- | --- | ---
NTP | |
Wi-Fi | |

[!NOTE] Acesso à funcionalidade
> Caminho: Menu Ferramentas > Pré Configuração do dispositivo.

Considerações Finais
Um breve resumo sobre tudo o que foi discutido.

Leia Também
Comparativo Homologações
Guia - Termos de Homologação de Dispositivos`,
};

type Skill = { id: number; name: string; prompt: string };
type HistoryItem = { id: number; input: string; output: string; type: string; date: string };

function NavItem({
  icon, label, active, onClick, collapsed,
}: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; collapsed: boolean;
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
      <div className="shrink-0">{icon}</div>
      {!collapsed && <span className="font-bold text-xs tracking-wide">{label}</span>}
    </button>
  );
}

export default function ValidatorPageStandalone() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("home");
  const [operationType, setOperationType] = useState("validar");
  const [template, setTemplate] = useState<keyof typeof TEMPLATES>("GERAL");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState("");
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

  const callGemini = async () => {
    if (!inputText) return;
    setLoading(true);

    let systemPrompt = "";
    if (operationType === "validar") {
      systemPrompt = `Você é um Analista de Documentação da IXCsoft.
OBJETIVO: Validar o texto colado com base nas documentações das centrais (Wiki ERP: wiki-erp.ixcsoft.com.br e Central ACS: central-ixcacs.ixcsoft.com.br).
AÇÕES:
1. Indique exatamente onde o analista deve alterar a informação.
2. Indique quais links da Wiki ou Central ACS são relevantes.
3. Forneça uma sugestão de texto aprimorada com base na informação colada.
4. Gere 1 ou 2 perguntas de forma IMPESSOAL que podem ser respondidas lendo o trecho do texto.
Contexto: Reduzir tempo de busca e edição de documentação.`;
    } else {
      systemPrompt = `Você é um Gerador de Documentação Técnica IXCsoft.
Utilize o padrão de template: ${template}.
CONTEXTO: Baseie-se no input do Jira/Rovo: ${inputText}.
TOM DE VOZ: Técnico, qualidade IXC Provedor/ACS, mas compreensível para o cliente final.
${selectedSkill ? `APLIQUE ESTA SKILL PERSONALIZADA: ${selectedSkill}` : ""}`;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: inputText }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
          }),
        }
      );
      const data = await response.json();
      const resultText =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Não foi possível gerar uma resposta.";
      setOutputText(resultText);
      setHistory([
        { id: Date.now(), input: inputText, output: resultText, type: operationType, date: new Date().toLocaleString() },
        ...history,
      ]);
    } catch (error) {
      console.error(error);
      alert("Falha na comunicação com o Gemini.");
    } finally {
      setLoading(false);
    }
  };

  const displayName = user?.name ?? "Usuário";

  return (
    <div className="h-screen flex bg-slate-950 font-sans text-slate-200">
      {/* SIDEBAR */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-20"} bg-slate-900 text-slate-400 transition-all duration-300 flex flex-col shrink-0 overflow-hidden border-r border-slate-800`}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shrink-0">
            <Database size={24} />
          </div>
          {sidebarOpen && (
            <span className="font-bold text-white text-lg tracking-tight">Validador IXC</span>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavItem icon={<Layout size={20} />} label="Home" active={activeTab === "home"} onClick={() => setActiveTab("home")} collapsed={!sidebarOpen} />
          <NavItem icon={<History size={20} />} label="Histórico" active={activeTab === "history"} onClick={() => setActiveTab("history")} collapsed={!sidebarOpen} />
          <NavItem icon={<Sparkles size={20} />} label="Personalização" active={activeTab === "skills"} onClick={() => setActiveTab("skills")} collapsed={!sidebarOpen} />
          <NavItem icon={<User size={20} />} label="Usuário" active={activeTab === "user"} onClick={() => setActiveTab("user")} collapsed={!sidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full hover:bg-red-500/10 hover:text-red-400 rounded-lg transition text-sm"
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
            >
              <Menu size={20} />
            </button>
            <h2 className="font-semibold text-slate-300 capitalize text-sm tracking-wide">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white leading-none">{displayName}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">{user?.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold shadow-md">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
          <div className="max-w-6xl mx-auto">

            {/* HOME */}
            {activeTab === "home" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setOperationType("validar")}
                      className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${operationType === "validar" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      <Search size={14} /> VALIDAR
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperationType("gerar")}
                      className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${operationType === "gerar" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      <Plus size={14} /> GERAR
                    </button>
                  </div>

                  {operationType === "gerar" && (
                    <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      {(["GERAL", "CADASTRO", "HOMOLOGACAO"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTemplate(t)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${template === t ? "bg-slate-700 text-blue-400" : "text-slate-500 hover:text-slate-300"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* INPUT */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col h-[550px]">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <MessageSquare size={14} className="text-blue-500" /> Campo de Input
                      </label>
                      <div className="flex gap-2">
                        {skills.length > 0 && (
                          <select
                            value={selectedSkill}
                            onChange={(e) => setSelectedSkill(e.target.value)}
                            className="text-[10px] bg-slate-800 border border-slate-700 rounded px-2 py-1 outline-none font-bold text-slate-300"
                          >
                            <option value="">Sem Skill</option>
                            {skills.map((s) => (
                              <option key={s.id} value={s.prompt}>{s.name}</option>
                            ))}
                          </select>
                        )}
                        <button type="button" onClick={() => setInputText("")} className="p-1 text-slate-600 hover:text-red-500">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={operationType === "validar" ? "Cole aqui o texto para validar..." : "Cole aqui o input do Jira/Rovo..."}
                      className="flex-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none transition font-sans leading-relaxed text-slate-200 placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={callGemini}
                      disabled={loading || !inputText}
                      className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><Bot size={18} /> {operationType === "validar" ? "VALIDAR INFORMAÇÃO" : "GERAR DOCUMENTAÇÃO"}</>
                      )}
                    </button>
                  </div>

                  {/* OUTPUT */}
                  <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col h-[550px]">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Bot size={14} className="text-blue-500" /> Resultado da IA
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.createElement("textarea");
                          el.value = outputText;
                          document.body.appendChild(el);
                          el.select();
                          document.execCommand("copy");
                          document.body.removeChild(el);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-lg text-[10px] font-bold transition border border-slate-700"
                      >
                        <Copy size={14} /> COPIAR
                      </button>
                    </div>
                    <div className="flex-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed text-slate-300">
                      {outputText || (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3">
                          <Sparkles size={40} className="opacity-30" />
                          <p className="italic">Aguardando sua solicitação...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HISTÓRICO */}
            {activeTab === "history" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Histórico de Solicitações</h3>
                  <button
                    type="button"
                    onClick={() => setHistory([])}
                    className="text-xs text-red-500 font-bold hover:bg-red-500/10 px-3 py-2 rounded-lg transition flex items-center gap-2"
                  >
                    <Trash2 size={14} /> LIMPAR TUDO
                  </button>
                </div>
                {history.length === 0 ? (
                  <div className="text-center py-20 bg-slate-900 rounded-2xl border border-dashed border-slate-700">
                    <History size={48} className="mx-auto text-slate-700 mb-4" />
                    <p className="text-slate-500 text-sm">Seu histórico está vazio.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition">
                      <div className="px-6 py-3 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${item.type === "validar" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
                            {item.type}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{item.date}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHistory(history.filter((h) => h.id !== item.id))}
                          className="text-slate-600 hover:text-red-500 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="p-6 grid md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Input do Usuário</p>
                          <p className="text-xs text-slate-400 line-clamp-4 bg-slate-800 p-3 rounded-lg border border-slate-700 italic">"{item.input}"</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-blue-500 uppercase mb-2">Resultado IA</p>
                          <p className="text-xs text-slate-300 line-clamp-4 bg-blue-500/5 p-3 rounded-lg border border-blue-500/20">{item.output}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* SKILLS */}
            {activeTab === "skills" && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl">
                  <h3 className="text-xl font-bold mb-2">Personalização de Skills</h3>
                  <p className="text-sm opacity-80 leading-relaxed">
                    Defina instruções específicas (System Prompts) para que a IA se comporte exatamente como você deseja em cada cenário de documentação.
                  </p>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                  <h4 className="font-bold text-sm mb-4 text-white">Nova Skill</h4>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget as HTMLFormElement);
                      const name = String(fd.get("skill_name") || "");
                      const prompt = String(fd.get("skill_prompt") || "");
                      if (!name || !prompt) return;
                      setSkills([...skills, { id: Date.now(), name, prompt }]);
                      e.currentTarget.reset();
                    }}
                    className="space-y-4"
                  >
                    <input
                      name="skill_name"
                      placeholder="Ex: Redação Técnica ACS Nível 2"
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 placeholder:text-slate-600"
                    />
                    <textarea
                      name="skill_prompt"
                      placeholder="Ex: Sempre use uma linguagem mais formal e detalhe cada passo técnico..."
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 placeholder:text-slate-600"
                    />
                    <button
                      type="submit"
                      className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition text-xs tracking-widest"
                    >
                      ADICIONAR SKILL
                    </button>
                  </form>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {skills.map((s) => (
                    <div key={s.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Bot size={16} className="text-blue-500" />
                          <p className="font-bold text-white text-sm">{s.name}</p>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-3 bg-slate-800 p-2 rounded border border-slate-700 italic">"{s.prompt}"</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSkills(skills.filter((sk) => sk.id !== s.id))}
                        className="mt-4 text-red-500 hover:bg-red-500/10 py-2 rounded-lg transition text-[10px] font-bold flex items-center justify-center gap-2"
                      >
                        <Trash2 size={12} /> REMOVER
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* USUÁRIO */}
            {activeTab === "user" && (
              <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-2xl border border-slate-800">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold text-3xl mb-4 border border-blue-600/30">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="text-xl font-bold text-white">{displayName}</h3>
                  <p className="text-sm text-slate-400 font-mono">{user?.email}</p>
                </div>
                <div className="space-y-6 pt-6 border-t border-slate-800">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Segurança</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">Nova Senha</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-200"
                    />
                  </div>
                  <button
                    type="button"
                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-600/10 hover:bg-blue-700 transition text-xs tracking-widest"
                  >
                    ATUALIZAR SENHA
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
