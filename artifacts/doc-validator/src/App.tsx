import React, { useState, useEffect } from 'react';
import { 
  Cpu, Search, BookOpen, Settings, Key, Bot, MessageSquare, 
  History, User, Plus, Trash2, Send, CheckCircle2, AlertCircle, 
  FileText, Copy, Menu, X, LogOut, Sparkles, ChevronRight,
  ShieldCheck, Database, Layout, Wifi, Info
} from 'lucide-react';

// --- CONFIGURAÇÃO E ESTADOS INICIAIS ---
const API_KEY = ""; // A plataforma injeta a chave automaticamente
const APP_ID = "validador-ixc-v1";

type Skill = {
  id: number;
  name: string;
  prompt: string;
};

type HistoryItem = {
  id: number;
  input: string;
  output: string;
  type: string;
  date: string;
};

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
Guia - Termos de Homologação de Dispositivos`
};

export default function App() {
  // --- ESTADOS ---
  const [user, setUser] = useState<{ email: string; name: string; birthDate: string } | null>(null);
  const [authMode, setAuthMode] = useState('login');
  const [activeTab, setActiveTab] = useState('home');
  const [operationType, setOperationType] = useState('validar');
  const [template, setTemplate] = useState<keyof typeof TEMPLATES>('GERAL');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [users, setUsers] = useState<Array<{ email: string; name: string; birthDate: string; password: string; fullName: string }>>([]);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- PERSISTÊNCIA ---
  useEffect(() => {
    const savedUser = localStorage.getItem('ixc_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    const savedHistory = localStorage.getItem('ixc_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedSkills = localStorage.getItem('ixc_skills');
    if (savedSkills) setSkills(JSON.parse(savedSkills));

    const savedUsers = localStorage.getItem('ixc_users');
    if (savedUsers) setUsers(JSON.parse(savedUsers));
  }, []);

  useEffect(() => {
    localStorage.setItem('ixc_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('ixc_skills', JSON.stringify(skills));
  }, [skills]);

  // --- LÓGICA DE AUTH ---
  const saveUsers = (nextUsers: typeof users) => {
    setUsers(nextUsers);
    localStorage.setItem('ixc_users', JSON.stringify(nextUsers));
  };

  const handleAuth = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    const birthDate = String(formData.get('birthdate') || '');
    const fullName = String(formData.get('fullname') || '').trim();

    if (!email.endsWith('@ixcsoft.com.br')) {
      alert('Acesso restrito a e-mails @ixcsoft.com.br');
      return;
    }

    if (authMode === 'login') {
      const existing = users.find((u) => u.email === email);
      if (!existing) {
        alert('Usuário não encontrado. Cadastre-se primeiro.');
        return;
      }
      if (existing.password !== password) {
        alert('Senha incorreta.');
        return;
      }
      setUser({ email, name: existing.name, birthDate: existing.birthDate });
      localStorage.setItem('ixc_user', JSON.stringify({ email, name: existing.name, birthDate: existing.birthDate }));
      return;
    }

    if (authMode === 'register') {
      if (!password || !birthDate) {
        alert('Para cadastro, informe senha e data de nascimento.');
        return;
      }
      if (users.some((u) => u.email === email)) {
        alert('Este e-mail já está cadastrado. Faça login.');
        return;
      }
      const name = email.split('@')[0].replace('.', ' ');
      const nextUser = { email, name, birthDate, password, fullName: name };
      saveUsers([...users, nextUser]);
      setUser({ email, name, birthDate });
      localStorage.setItem('ixc_user', JSON.stringify({ email, name, birthDate }));
      return;
    }

    if (authMode === 'reset') {
      if (!password || !birthDate || !fullName) {
        alert('Para redefinir a senha, confirme e-mail, nome completo, data de nascimento e nova senha.');
        return;
      }
      const existing = users.find((u) => u.email === email && u.birthDate === birthDate && u.fullName.toLowerCase() === fullName.toLowerCase());
      if (!existing) {
        alert('Dados não conferem com nenhum usuário cadastrado.');
        return;
      }
      const updated = users.map((u) => u.email === email ? { ...u, password } : u);
      saveUsers(updated);
      alert('Senha redefinida com sucesso. Agora faça login.');
      setAuthMode('login');
      return;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ixc_user');
  };

  // --- LÓGICA DE IA (GEMINI) ---
  const callGemini = async () => {
    if (!inputText) return;
    setLoading(true);

    let systemPrompt = "";
    if (operationType === 'validar') {
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
      ${selectedSkill ? `APLIQUE ESTA SKILL PERSONALIZADA: ${selectedSkill}` : ''}`;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: inputText }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });
      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar uma resposta.";
      
      setOutputText(resultText);
      setHistory([{ 
        id: Date.now(), 
        input: inputText, 
        output: resultText, 
        type: operationType,
        date: new Date().toLocaleString() 
      }, ...history]);
    } catch (error) {
      console.error(error);
      alert('Falha na comunicação com o Gemini.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-200">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-600 p-3 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Validador IXC</h1>
            <p className="text-slate-400 text-sm mt-1 text-center">Somente e-mails @ixcsoft.com.br</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail Institucional</label>
              <input name="email" type="email" required placeholder="seu.nome@ixcsoft.com.br" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
              <input name="password" type="password" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nascimento</label>
                <input name="birthdate" type="date" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
            )}

            {authMode === 'reset' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                  <input name="fullname" type="text" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nascimento</label>
                  <input name="birthdate" type="date" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                </div>
              </>
            )}

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-600/20 transition-all uppercase tracking-wider text-sm">
              {authMode === 'login' ? 'Entrar' : authMode === 'register' ? 'Cadastrar' : 'Redefinir Senha'}
            </button>
          </form>

          <div className="mt-6 flex justify-between text-xs text-slate-500">
            {authMode === 'login' ? (
              <>
                <button type="button" onClick={() => setAuthMode('register')} className="hover:text-blue-400">Novo usuário?</button>
                <button type="button" onClick={() => setAuthMode('reset')} className="hover:text-blue-400">Esqueceu a senha?</button>
              </>
            ) : (
              <button type="button" onClick={() => setAuthMode('login')} className="hover:text-blue-400 mx-auto underline">Voltar para entrar</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-50 font-sans text-slate-800">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-slate-400 transition-all duration-300 flex flex-col shrink-0 overflow-hidden`}>
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Database size={24} />
          </div>
          {sidebarOpen && <span className="font-bold text-white text-lg tracking-tight">Validador IXC</span>}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavItem icon={<Layout size={20} />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} collapsed={!sidebarOpen} />
          <NavItem icon={<History size={20} />} label="Histórico" active={activeTab === 'history'} onClick={() => setActiveTab('history')} collapsed={!sidebarOpen} />
          <NavItem icon={<Sparkles size={20} />} label="Personalização" active={activeTab === 'skills'} onClick={() => setActiveTab('skills')} collapsed={!sidebarOpen} />
          <NavItem icon={<User size={20} />} label="Usuário" active={activeTab === 'user'} onClick={() => setActiveTab('user')} collapsed={!sidebarOpen} />
        </nav>

        <div className="p-4 bg-slate-800/50">
          <button type="button" onClick={logout} className="flex items-center gap-3 px-3 py-2 w-full hover:bg-red-500/10 hover:text-red-400 rounded-lg transition text-sm">
            <LogOut size={18} />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <Menu size={20} />
            </button>
            <h2 className="font-semibold text-slate-700 capitalize text-sm tracking-wide">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">{user.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold shadow-md">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'home' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button 
                      type="button"
                      onClick={() => setOperationType('validar')}
                      className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${operationType === 'validar' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Search size={14} /> VALIDAR
                    </button>
                    <button 
                      type="button"
                      onClick={() => setOperationType('gerar')}
                      className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${operationType === 'gerar' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Plus size={14} /> GERAR
                    </button>
                  </div>

                  {operationType === 'gerar' && (
                    <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                      {['GERAL', 'CADASTRO', 'HOMOLOGACAO'].map((t) => (
                        <button 
                          key={t}
                          type="button"
                          onClick={() => setTemplate(t as keyof typeof TEMPLATES)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${template === t ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[550px]">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <MessageSquare size={14} className="text-blue-600" /> Input
                      </label>
                      <div className="flex gap-2">
                        {skills.length > 0 && (
                          <select 
                            value={selectedSkill}
                            onChange={(e) => setSelectedSkill(e.target.value)}
                            className="text-[10px] bg-slate-100 border border-slate-200 rounded px-2 py-1 outline-none font-bold text-slate-600"
                          >
                            <option value="">Sem Skill</option>
                            {skills.map((s) => (
                              <option key={s.id} value={s.prompt}>{s.name}</option>
                            ))}
                          </select>
                        )}
                        <button type="button" onClick={() => setInputText('')} className="p-1 text-slate-300 hover:text-red-500"><X size={16} /></button>
                      </div>
                    </div>
                    <textarea 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={operationType === 'validar' ? 'Cole aqui o texto para validar...' : 'Cole aqui o input do Jira/Rovo...'}
                      className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none transition font-sans leading-relaxed"
                    />
                    <button 
                      type="button"
                      onClick={callGemini}
                      disabled={loading || !inputText}
                      className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-3"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <><Bot size={18}/> {operationType === 'validar' ? 'VALIDAR INFORMAÇÃO' : 'GERAR DOCUMENTAÇÃO'}</>
                      )}
                    </button>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[550px]">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Bot size={14} className="text-blue-600" /> Output
                      </label>
                      <button 
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(outputText); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg text-[10px] font-bold transition border border-slate-100"
                      >
                        <Copy size={14} /> COPIAR
                      </button>
                    </div>
                    <div className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed text-slate-700">
                      {outputText || (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                          <Sparkles size={40} className="opacity-20" />
                          <p className="italic">Aguardando sua solicitação...</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Histórico de Solicitações</h3>
                  <button type="button" onClick={() => setHistory([])} className="text-xs text-red-500 font-bold hover:bg-red-50 px-3 py-2 rounded-lg transition flex items-center gap-2">
                    <Trash2 size={14} /> LIMPAR TUDO
                  </button>
                </div>
                {history.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                    <History size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 text-sm">Seu histórico está vazio.</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${item.type === 'validar' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.type}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                        </div>
                        <button type="button" onClick={() => setHistory(history.filter((h) => h.id !== item.id))} className="text-slate-300 hover:text-red-500 p-1">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="p-6 grid md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Input do Usuário</p>
                          <p className="text-xs text-slate-600 line-clamp-4 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">"{item.input}"</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-blue-400 uppercase mb-2">Resultado IA</p>
                          <p className="text-xs text-slate-700 line-clamp-4 bg-blue-50/30 p-3 rounded-lg border border-blue-50">{item.output}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl">
                  <h3 className="text-xl font-bold mb-2">Personalização de Skills</h3>
                  <p className="text-sm opacity-80 leading-relaxed">Defina instruções específicas (System Prompts) para que a IA se comporte exatamente como você deseja em cada cenário de documentação.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-sm mb-4">Nova Skill</h4>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget as HTMLFormElement);
                    const name = String(fd.get('skill_name') || '');
                    const prompt = String(fd.get('skill_prompt') || '');
                    if (!name || !prompt) return;
                    setSkills([...skills, { id: Date.now(), name, prompt }]);
                    e.currentTarget.reset();
                  }} className="space-y-4">
                    <input name="skill_name" placeholder="Nome da Skill (Ex: Redação Técnica ACS)" required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none" />
                    <textarea name="skill_prompt" placeholder="Instruções específicas para a IA (O prompt de skill)..." required className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm min-h-[100px] outline-none" />
                    <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition">Salvar Skill</button>
                  </form>
                </div>

                <div className="grid gap-4">
                  {skills.map((s) => (
                    <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-400 line-clamp-1">{s.prompt}</p>
                      </div>
                      <button type="button" onClick={() => setSkills(skills.filter((sk) => sk.id !== s.id))} className="text-red-400 hover:bg-red-50 p-2 rounded-lg transition">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'user' && (
              <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold mb-6">Configurações de Conta</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Alterar Senha</label>
                    <input type="password" placeholder="Senha Atual" className="w-full mb-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" />
                    <input type="password" placeholder="Nova Senha" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm" />
                  </div>
                  <button type="button" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-600/10">Atualizar Credenciais</button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; collapsed: boolean }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}
    >
      <div className="shrink-0">{icon}</div>
      {!collapsed && <span className="font-bold text-xs tracking-wide">{label}</span>}
    </button>
  );
}
