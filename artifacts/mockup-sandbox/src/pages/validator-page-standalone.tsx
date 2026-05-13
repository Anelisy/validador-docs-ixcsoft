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
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";

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
const [template, setTemplate] =
useState<keyof typeof TEMPLATES>("GERAL");

const [inputText, setInputText] = useState("");
const [outputText, setOutputText] = useState("");
const [loading, setLoading] = useState(false);

const [history, setHistory] = useState<HistoryItem[]>([]);
const [skills, setSkills] = useState<Skill[]>([]);
const [selectedSkill, setSelectedSkill] = useState("");

const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

const [sidebarOpen, setSidebarOpen] = useState(true);

useEffect(() => {
const savedHistory = localStorage.getItem("ixc_history");
if (savedHistory) {
setHistory(JSON.parse(savedHistory));
}

const savedSkills = localStorage.getItem("ixc_skills");
if (savedSkills) {
setSkills(JSON.parse(savedSkills));
}
}, []);

useEffect(() => {
localStorage.setItem("ixc_history", JSON.stringify(history));
}, [history]);

useEffect(() => {
localStorage.setItem("ixc_skills", JSON.stringify(skills));
}, [skills]);

const callGemini = async () => {
if (!inputText) return;

if (!API_KEY) {
alert(
"Chave da API do Gemini não configurada. Defina a variável VITE_GEMINI_API_KEY."
);
return;
}

setLoading(true);

let systemPrompt = "";

if (operationType === "validar") {
systemPrompt = `Você é um Analista de Documentação da IXCsoft.

OBJETIVO:
Validar o texto colado com base nas documentações das centrais.

AÇÕES:

Indique exatamente onde o analista deve alterar a informação.

Indique quais links da Wiki ou Central ACS são relevantes.

Forneça uma sugestão de texto aprimorada.

Gere 1 ou 2 perguntas impessoais sobre o conteúdo.`;
} else {
systemPrompt = `Você é um Gerador de Documentação Técnica IXCsoft para VitePress.

Regras:

Não invente seções

Não altere a ordem do template

Preserve containers VitePress

Template:
${TEMPLATES[template]}

${selectedSkill ? APLIQUE ESTA SKILL: ${selectedSkill} : ""}`;
}

try {
const response = await fetch(
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY},
{
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
contents: [
{
parts: [{ text: inputText }],
},
],
systemInstruction: {
parts: [{ text: systemPrompt }],
},
}),
}
);

const data = await response.json();

const resultText =
data.candidates?.?.content?.parts?.?.text ??
"Não foi possível gerar resposta.";

setOutputText(resultText);

setHistory((prev) => [
{
id: Date.now(),
input: inputText,
output: resultText,
type: operationType,
date: new Date().toLocaleString(),
},
...prev,
]);
} catch (error) {
console.error(error);
alert("Erro ao comunicar com Gemini.");
} finally {
setLoading(false);
}
};

const copyOutput = () => {
navigator.clipboard.writeText(outputText);
};

const displayName = user?.name ?? "Usuário";

return (
<div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-200">
<aside
className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
sidebarOpen ? "w-64" : "w-20"
}`}
>
<div className="p-6 flex items-center gap-3">
<div className="bg-blue-600 p-2 rounded-lg text-white">
<Database size={24} />
</div>

{sidebarOpen && (
<span className="font-bold text-white text-lg">
Validador IXC
</span>
)}
</div>

<nav className="flex-1 px-4 py-4 space-y-1">
{NAV_ITEMS.map(({ id, label, icon }) => (
<NavItem
key={id}
icon={icon}
label={label}
active={activeTab === id}
onClick={() => setActiveTab(id)}
collapsed={!sidebarOpen}
/>
))}
</nav>

<div className="p-4 border-t border-slate-800">
<button
type="button"
onClick={logout}
className="flex items-center gap-3 px-3 py-2 w-full hover:bg-red-500/10 hover:text-red-400 rounded-lg transition"
>
<LogOut size={18} />
{sidebarOpen && <span>Sair</span>}
</button>
</div>
</aside>

<div className="flex-1 flex flex-col min-w-0">
<header className="h-14 md:h-16 bg-slate-900 border-b border-slate-800 px-4 md:px-8 flex items-center justify-between">
<div className="flex items-center gap-3">
<button
type="button"
onClick={() => setSidebarOpen(!sidebarOpen)}
className="hidden md:flex p-2 hover:bg-slate-800 rounded-lg"
>
<Menu size={20} />
</button>

<h2 className="hidden md:block font-semibold capitalize">
{activeTab}
</h2>
</div>

<div className="flex items-center gap-3">
<div className="text-right hidden sm:block">
<p className="text-sm font-bold text-white">{displayName}</p>
<p className="text-[10px] text-slate-400">
{user?.email}
</p>
</div>

<div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
{displayName.charAt(0).toUpperCase()}
</div>
</div>
</header>

<main className="flex-1 overflow-y-auto p-4 md:p-6">
{activeTab === "home" && (
<div className="flex flex-col gap-5">
<div className="flex flex-wrap gap-3">
<div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
<button
type="button"
onClick={() => setOperationType("validar")}
className={`px-5 py-2 rounded-lg text-xs font-bold ${
operationType === "validar"
? "bg-blue-600 text-white"
: "text-slate-400"
}`}
>
VALIDAR
</button>

<button
type="button"
onClick={() => setOperationType("gerar")}
className={`px-5 py-2 rounded-lg text-xs font-bold ${
operationType === "gerar"
? "bg-blue-600 text-white"
: "text-slate-400"
}`}
>
GERAR
</button>
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
<div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col">
<div className="flex justify-between items-center mb-3">
<label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
<MessageSquare size={14} />
Campo de Input
</label>

<button
type="button"
onClick={() => setInputText("")}
className="p-1 text-slate-600 hover:text-red-500"
>
<X size={16} />
</button>
</div>

<textarea
value={inputText}
onChange={(e) => setInputText(e.target.value)}
placeholder="Cole aqui..."
className="flex-1 w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm resize-none outline-none min-h-[200px]"
/>

<button
type="button"
onClick={callGemini}
disabled={loading || !inputText}
className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3"
>
{loading ? (
<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
) : (
<>
<Bot size={18} />
{operationType === "validar"
? "VALIDAR INFORMAÇÃO"
: "GERAR DOCUMENTAÇÃO"}
</>
)}
</button>
</div>

<div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col">
<div className="flex justify-between items-center mb-3">
<label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
<Bot size={14} />
Resultado
</label>

<button
type="button"
onClick={copyOutput}
className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg text-xs"
>
<Copy size={14} />
COPIAR
</button>
</div>

<div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-4 whitespace-pre-wrap text-sm overflow-y-auto min-h-[200px]">
{outputText || "Aguardando solicitação..."}
</div>
</div>
</div>
</div>
)}

{activeTab === "skills" && (
<div className="max-w-3xl mx-auto space-y-6">
<div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
<h4 className="font-bold text-white mb-4">
{editingSkill ? "Editar Skill" : "Nova Skill"}
</h4>

<form
onSubmit={(e) => {
e.preventDefault();

const fd = new FormData(
e.currentTarget as HTMLFormElement
);

const name = String(fd.get("skill_name") || "");
const prompt = String(fd.get("skill_prompt") || "");

const category = String(
fd.get("skill_category") || "GERAL"
) as Skill["category"];

if (!name || !prompt) return;

if (editingSkill) {
setSkills(
skills.map((s) =>
s.id === editingSkill.id
? { ...s, name, prompt, category }
: s
)
);

setEditingSkill(null);
} else {
setSkills([
...skills,
{
id: Date.now(),
name,
prompt,
category,
},
]);
}

e.currentTarget.reset();
}}
className="space-y-3"
>
<input
name="skill_name"
placeholder="Nome da skill"
defaultValue={editingSkill?.name ?? ""}
className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3"
/>

<select
name="skill_category"
defaultValue={editingSkill?.category ?? "GERAL"}
className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3"
>
<option value="GERAL">Geral</option>
<option value="CADASTRO">Cadastro</option>
<option value="HOMOLOGACAO">Homologação</option>
</select>

<textarea
name="skill_prompt"
placeholder="Prompt da skill"
defaultValue={editingSkill?.prompt ?? ""}
className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 min-h-[120px]"
/>

<button
type="submit"
className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg"
>
{editingSkill ? "SALVAR ALTERAÇÕES" : "ADICIONAR SKILL"}
</button>
</form>
</div>

<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
{skills.map((s) => (
<div
key={s.id}
className="bg-slate-900 p-5 rounded-2xl border border-slate-800"
>
<div className="flex items-center gap-2 mb-3">
<Bot size={16} />
<p className="font-bold text-white">{s.name}</p>
</div>

<p className="text-xs text-slate-400 mb-4">{s.prompt}</p>

<div className="flex gap-2">
<button
type="button"
onClick={() => setEditingSkill(s)}
className="flex-1 text-blue-400 hover:bg-blue-500/10 py-2 rounded-lg transition text-xs font-bold"
>
EDITAR
</button>

<button
type="button"
onClick={() =>
setSkills((prev) => prev.filter((sk) => sk.id !== s.id))
}
className="flex-1 text-red-500 hover:bg-red-500/10 py-2 rounded-lg transition text-xs font-bold flex items-center justify-center gap-1"
>
<Trash2 size={12} />
REMOVER
</button>
</div>
</div>
))}
</div>

{skills.length === 0 && (
<div className="text-center py-12 text-slate-600">
Nenhuma skill cadastrada.
</div>
)}
</div>
)}
</main>
</div>
</div>
);
}