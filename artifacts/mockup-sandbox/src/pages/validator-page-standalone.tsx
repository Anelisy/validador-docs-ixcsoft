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

// Configuração para skills compartilhadas via GitHub Gist
const GIST_ID = "seu-gist-id-aqui"; // Criar um Gist público
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN ?? "";

// Função para carregar skills compartilhadas
const loadSharedSkills = async (): Promise<Skill[]> => {
  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`);
    const data = await response.json();
    if (data.files && data.files["skills.json"]) {
      const content = JSON.parse(data.files["skills.json"].content);
      return content.skills || [];
    }
  } catch (error) {
    console.error("Erro ao carregar skills compartilhadas:", error);
  }
  return [];
};

// Função para salvar skills compartilhadas
const saveSharedSkills = async (skills: Skill[]) => {
  if (!GITHUB_TOKEN) return;
  
  try {
    const content = {
      skills: skills,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.email || "unknown"
    };
    
    await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: {
          "skills.json": {
            content: JSON.stringify(content, null, 2)
          }
        }
      })
    });
  } catch (error) {
    console.error("Erro ao salvar skills compartilhadas:", error);
  }
};

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";
const HF_API_KEY = import.meta.env.VITE_HF_API_KEY ?? "";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY ?? "";

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

> [!NOTE] Acesso ao formulário
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

# {{NOME_DO_DISPOSITIVO}}

## Introdução

{{NOME_DO_DISPOSITIVO}} é um dispositivo fabricado pela/por Fabricante, projetado para oferecer funcionalidades essenciais para seus clientes. Este documento detalha as capacidades e limitações do dispositivo conforme testado e validado em nosso sistema do IXC ACS.

> [!INFO] Importante
As funcionalidades descritas foram testadas e validadas na versão a seguir:

- **Firmware homologado:** 
- **Hardware homologado:** 
- **DataModel:** 

## Pré-Configuração

A Pré-Configuração aplica parâmetros iniciais à rede. Confira abaixo as funcionalidades gerenciáveis via IXC ACS:

| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|
| NTP            | Requer verificação      |
| Wi-Fi          | Requer verificação      |

> [!NOTE] Acesso à funcionalidade
**Caminho**: Menu Ferramentas > Pré Configuração do dispositivo.

## Ações no Dispositivo

| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|
| Sincronizar    | **Sim**                 |
| Reiniciar      | **Não**                 |
| Reset          | **Sim**                 |

> [!NOTE] Acesso à funcionalidade
**Caminho:** Menu Dispositivos > Dispositivo > três pontos.

## Internet

### PPP

| Funcionalidade                  | Gerenciável via IXC ACS |
|--------------------------------|-------------------------|
| Habilitar/Desabilitar Interface | **Sim**                |
| Criar Nova Interface            | **Sim**                |
| Deletar Interface               | **Sim**                |
| DNS IPv4                        | **Sim**                |
| Modo IPv6                       | **Não**                |
| DNS IPv6                        | **Não**                |
| MTU                             | **Sim**                |
| Habilitar IPv6                  | **Sim**                |
| Configuração de VLAN            | **Sim**                |

### IP/DHCP

| Funcionalidade                  | Gerenciável via IXC ACS |
|--------------------------------|-------------------------|
| Habilitar/Desabilitar Interface | **Sim**                |
| Criar Nova Interface            | **Sim**                |
| Deletar Interface               | **Sim**                |
| Configurações de Conexão        | **Sim**                |
| DNS IPv4                        | **Sim**                |
| Modo IPv6                       | **Não**                |
| DNS IPv6                        | **Não**                |
| MTU                             | **Sim**                |
| Habilitar IPv6                  | **Sim**                |
| Configuração de VLAN            | **Sim**                |

> [!NOTE] Acesso à funcionalidade
**Caminho:** Menu Dispositivos > Dispositivo > Aba Conectividade > Internet.

## LAN

| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|
| Servidor DHCP  | **Sim**                 |
| Gateway        | **Sim**                 |
| DNS (LAN IPv4) | **Sim**                 |
| DNS (LAN IPv6) | **Sim**                 |

> [!NOTE] Acesso à funcionalidade
**Caminho**: Menu Dispositivos > Dispositivo > Aba Conectividade > LAN.

## Interfaces Wi-Fi

### 2.4GHz e 5.8GHz

| Funcionalidade                  | Gerenciável via IXC ACS |
|--------------------------------|-------------------------|
| Habilitar/Desabilitar Interface | **Não**                |
| SSID                            | **Sim**                |
| Alteração de Senha              | **Sim**                |
| Canal                           | **Sim**                |
| Largura de Banda                | **Sim**                |

| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|
| Band Steering  | **Não**                 |

> [!NOTE] Acesso à funcionalidade
**Caminho**: Menu Ferramentas > Pré Configuração do dispositivo.

## Dispositivos Conectados

| Funcionalidade                    | Gerenciável via IXC ACS |
|----------------------------------|-------------------------|
| Status do Host                    | **Sim**                 |
| Bloquear/Desbloquear Dispositivos | **Não**                 |
| Topologia de Rede                 | **Sim**                 |

> [!NOTE] Acesso à funcionalidade
**Caminho**: Menu Dispositivos > Dispositivo > Aba Conectividade > Dispositivos Conectados.

## Redirecionamento e Gerenciamento Web

| Funcionalidade             | Gerenciável via IXC ACS |
|----------------------------|-------------------------|
| Acesso Remoto              | **Não**                 |
| Porta Web                  | **Não**                 |
| Usuário Web                | **Sim**                 |
| Senha Web                  | **Sim**                 |
| Redirecionamento de Portas | **Sim**                 |
| TCP/UDP                    | **Sim**                 |

### Diagnósticos

| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|
| Ping           | **Sim**                 |
| Traceroute     | **Não**                 |
| Redes Próximas | **Sim**                 |
| Upload         | **Sim**                 |
| Download       | **Não**                 |

> [!NOTE] Acesso à funcionalidade
**Caminho**: Menu Dispositivos > Dispositivo > Aba Diagnósticos.

### Arquivos

Na aba de Arquivos, encontram-se listados os documentos e recursos necessários para a atualização do firmware do dispositivo.

| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|
| Firmware       | Requer verificação      |

> [!INFO] A comunicação com o IXC Provedor é realizada mediante o envio das informações de PPPoE, senha, SSID e sua respectiva senha.

## Considerações Finais

Resumo das funcionalidades testadas e validadas.

## Leia Também

- [[comparativo-homologacoes|Comparativo Homologações]]
- [[guia-termos-homologacao|Guia - Termos de Homologação de Dispositivos]]`,
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

  // Carregar dados iniciais (histórico + skills globais)
  useEffect(() => {
    // Carregar histórico do usuário atual
    const savedHistory = localStorage.getItem("ixc_history");
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    // Carregar skills GLOBAIS (compartilhadas entre todos usuários)
    const loadGlobalSkills = () => {
      try {
        // Tenta carregar do storage GLOBAL
        const globalSkills = localStorage.getItem("ixc_skills_global");
        if (globalSkills) {
          const skills = JSON.parse(globalSkills);
          setSkills(skills);
          return;
        }
        
        // Se não existir skills globais, tenta migrar do usuário atual
        const userSkills = localStorage.getItem("ixc_skills");
        if (userSkills) {
          const skills = JSON.parse(userSkills);
          setSkills(skills);
          // Salva como global para compartilhar
          localStorage.setItem("ixc_skills_global", JSON.stringify(skills));
          return;
        }
        
        // Skills padrão para primeiro uso (compartilhadas globalmente)
        const defaultSkills: Skill[] = [
          {
            id: Date.now(),
            name: "🎯 Especialista VitePress",
            prompt: "Você é especialista em VitePress. Use containers: > [!NOTE], > [!TIP], > [!WARNING], > [!SUCCESS], > [!INFO]. Preserve a sintaxe exata. Sempre use '> ' antes dos colchetes.",
            category: "GERAL"
          },
          {
            id: Date.now() + 1,
            name: "🔌 Documentação API REST",
            prompt: "Você é especialista em documentação de APIs REST. Use formatação para endpoints, métodos HTTP (GET, POST, PUT, DELETE), parâmetros, headers, exemplos de requisição/resposta. Inclua códigos de status HTTP.",
            category: "GERAL"
          },
          {
            id: Date.now() + 2,
            name: "📡 Homologação de Dispositivos",
            prompt: "Você é especialista em homologação de dispositivos para IXC ACS. Foco em funcionalidades gerenciáveis via ACS, tabelas de compatibilidade, versões de firmware, hardware homologado. Use tabelas markdown e containers > [!NOTE].",
            category: "HOMOLOGACAO"
          },
          {
            id: Date.now() + 3,
            name: "📝 Cadastro de Clientes",
            prompt: "Você é especialista em documentação de cadastros no IXCsoft. Foco em formulários, campos obrigatórios, validações, integrações com outros módulos. Use containers > [!NOTE] para acessos.",
            category: "CADASTRO"
          }
        ];
        setSkills(defaultSkills);
        localStorage.setItem("ixc_skills_global", JSON.stringify(defaultSkills));
      } catch (error) {
        console.error("Erro ao carregar skills globais:", error);
      }
    };
    
    loadGlobalSkills();
  }, []);

  // Salvar histórico do usuário (mantém separado por usuário)
  useEffect(() => {
    localStorage.setItem("ixc_history", JSON.stringify(history));
  }, [history]);

  // Salvar skills GLOBAIS (qualquer usuário que modificar, todos veem)
  useEffect(() => {
    if (skills.length > 0) {
      localStorage.setItem("ixc_skills_global", JSON.stringify(skills));
      // Disparar evento para sincronizar outras abas do mesmo navegador
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'ixc_skills_global',
        newValue: JSON.stringify(skills)
      }));
    }
  }, [skills]);

  // Sincronizar skills entre abas (se outra aba modificar)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ixc_skills_global' && e.newValue) {
        const updatedSkills = JSON.parse(e.newValue);
        setSkills(updatedSkills);
        // Mostrar notificação visual
        setOutputText(prev => prev + "\n\n📢 Skills atualizadas por outro usuário!");
        setTimeout(() => {
          setOutputText(prev => prev.replace("\n\n📢 Skills atualizadas por outro usuário!", ""));
        }, 3000);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);
  // Adicione no header ou sidebar um badge indicando skills compartilhadas
<div className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 rounded-lg">
  <Database size={14} className="text-blue-400" />
  <span className="text-xs text-blue-400">
    📚 Skills compartilhadas ({skills.length})
  </span>
</div>

  // Função para chamada única do Gemini (usada pelo processamento em partes)
  const callGeminiSingle = async (text: string, systemPrompt: string): Promise<string> => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nTEXTO DO USUÁRIO:\n${text}` }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 16384,
            topP: 0.95,
            topK: 40,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sem resposta da API";
  };

  // Função para dividir texto grande em partes
  const splitIntoChunks = (text: string, maxChunkSize: number = 8000) => {
    const chunks: string[] = [];
    const paragraphs = text.split('\n\n');
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxChunkSize) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  };

  // Função para processar texto grande em partes
  const processLargeText = async (fullText: string, systemPrompt: string) => {
    const chunks = splitIntoChunks(fullText);
    
    if (chunks.length === 1) {
      return await callGeminiSingle(chunks[0], systemPrompt);
    }
    
    setOutputText(`📄 Texto grande detectado (${chunks.length} partes). Processando...`);
    
    const results: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      setOutputText(`🔄 Processando parte ${i + 1} de ${chunks.length}...`);
      const result = await callGeminiSingle(chunks[i], systemPrompt);
      results.push(`## Parte ${i + 1}/${chunks.length}\n\n${result}`);
    }
    
    return results.join('\n\n---\n\n');
  };

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

REGRAS OBRIGATÓRIAS DE FORMATAÇÃO:
1. Containers VitePress: SEMPRE iniciar com "> " antes do tipo
   Correto: > [!NOTE] Título
   Correto: > [!INFO] Importante
   Correto: > [!WARNING] Atenção
   Correto: > [!TIP] Dica
2. Tabelas: Use | Cabeçalho | Cabeçalho |
            |-----------|------------|
            | Dado       | Dado       |
3. Títulos: Use # para título principal, ## para seções
4. Ênfase: Use **Negrito** para valores importantes (Sim, Não, OK, Sem capacidade)
5. Nome do dispositivo: Extraia CORRETAMENTE da primeira linha do texto. Exemplo: "[Homologação] CDTC FD714GS1-R850" → título deve ser "# CDTC FD714GS1-R850"

FONTES DE PESQUISA E COMPARAÇÃO:
- Central IXC Provedor: https://central.ixcprovedor.com.br
- Central IXC ACS: https://central-ixcacs.ixcsoft.com.br
- Wiki ERP: https://wiki-erp.ixcsoft.com.br

FORMATO DE SAÍDA OBRIGATÓRIO:
# NOME_DO_DISPOSITIVO

## Introdução

> [!INFO] Importante
Informações do firmware, hardware e datamodel.

## Pré-Configuração
| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|

> [!NOTE] Acesso à funcionalidade
**Caminho**: Menu Ferramentas > Pré Configuração do dispositivo.

## Ações no Dispositivo
| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|

## Internet
| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|

## LAN
| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|

## Interfaces Wi-Fi
| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|

## Dispositivos Conectados
| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|

## Redirecionamento e Gerenciamento Web
| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|

## Diagnósticos
| Funcionalidade | Gerenciável via IXC ACS |
|----------------|-------------------------|

## Considerações Finais

## Leia Também

Template base: ${TEMPLATES[template]}
${selectedSkill ? `SKILL: ${selectedSkill}` : ""}

IMPORTANTE: Preserve a sintaxe exata dos containers (> [!NOTE]) e use **Negrito** para Sim/Não/OK/Sem capacidade.`;
    } else {
      systemPrompt = `Você é um Gerador de Documentação Técnica IXCsoft para VitePress.

REGRAS OBRIGATÓRIAS:
1. Containers VitePress: SEMPRE iniciar com "> " antes do tipo
   Correto: > [!NOTE] Título
   Correto: > [!INFO] Importante
   Correto: > [!WARNING] Atenção
   Correto: > [!TIP] Dica
   Correto: > [!CAUTION] Precaução

2. Tabelas: Use formatação markdown padrão
   | Cabeçalho 1 | Cabeçalho 2 |
   |-------------|-------------|
   | Dado 1      | Dado 2      |

3. Títulos: 
   # Nome do Dispositivo (extraído da primeira linha do texto do usuário)
   ## Seção Principal
   ### Subseção

4. Ênfase: Use **Negrito** para valores como Sim, Não, OK, Sem capacidade, Funcional

5. Seções obrigatórias na ordem:
   - Introdução (com > [!INFO])
   - Pré-Configuração (com > [!NOTE])
   - Ações no Dispositivo
   - Internet (subseções PPP e IP/DHCP)
   - LAN
   - Interfaces Wi-Fi (2.4GHz e 5.8GHz)
   - Dispositivos Conectados
   - Redirecionamento e Gerenciamento Web
   - Diagnósticos
   - Arquivos
   - Considerações Finais
   - Leia Também

Template: ${TEMPLATES[template]}
${selectedSkill ? `SKILL: ${selectedSkill}` : ""}

EXTRAIA O NOME DO DISPOSITIVO da primeira linha do texto do usuário. Exemplo: "[Homologação] CDTC FD714GS1-R850" → use "CDTC FD714GS1-R850" como título principal.`;
    }

    let resultText = "";
    let usedModel = "";

    try {
      // 1ª TENTATIVA: Gemini (com suporte a documentos longos)
      usedModel = "Gemini 2.5 Flash";
      
      // Usar processamento em partes para documentos longos
      resultText = await processLargeText(inputText, systemPrompt);
      
      if (resultText) {
        const finalOutput = `✨ **Gerado por:** ${usedModel}\n\n${resultText}\n\n---\n🕒 ${new Date().toLocaleString('pt-BR')}`;
        setOutputText(finalOutput);
        
        setHistory((prev) => {
          const newHistory = [
            { 
              id: Date.now(), 
              input: inputText.substring(0, 200) + (inputText.length > 200 ? '...' : ''), 
              output: `[${usedModel}] ${resultText.substring(0, 500)}...`, 
              type: operationType, 
              date: new Date().toLocaleString() 
            },
            ...prev,
          ];
          return newHistory.slice(0, 50);
        });
        
        setLoading(false);
        return;
      }
      
      // 2ª TENTATIVA: Hugging Face (fallback quando Gemini falha ou dá 429)
      console.log("Gemini falhou ou atingiu limite. Tentando Hugging Face...");
      setOutputText("⚠️ Gemini indisponível. Usando Hugging Face como fallback...");
      usedModel = "Hugging Face";
      
      const hfResponse = await fetch(
        "https://api-inference.huggingface.co/models/microsoft/phi-2",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: `### System:\n${systemPrompt}\n\n### User:\n${inputText}\n\n### Assistant:\n`,
            parameters: {
              max_new_tokens: 2048,
              temperature: 0.7,
              do_sample: true,
            },
          }),
        }
      );

      const hfData = await hfResponse.json();
      
      if (hfResponse.ok) {
        if (Array.isArray(hfData) && hfData[0]?.generated_text) {
          resultText = hfData[0].generated_text;
        } else if (hfData.generated_text) {
          resultText = hfData.generated_text;
        } else {
          resultText = JSON.stringify(hfData);
        }
        
        if (resultText) {
          const finalOutput = `✨ **Gerado por:** ${usedModel}\n\n${resultText}\n\n---\n🕒 ${new Date().toLocaleString('pt-BR')}`;
          setOutputText(finalOutput);
          
          setHistory((prev) => {
            const newHistory = [
              { 
                id: Date.now(), 
                input: inputText.substring(0, 200) + (inputText.length > 200 ? '...' : ''), 
                output: `[${usedModel}] ${resultText.substring(0, 500)}...`, 
                type: operationType, 
                date: new Date().toLocaleString() 
              },
              ...prev,
            ];
            return newHistory.slice(0, 50);
          });
          
          setLoading(false);
          return;
        }
      }
      
      // Se chegou aqui, ambos falharam
      throw new Error("Gemini e Hugging Face falharam. Tente novamente em alguns instantes.");
      
    } catch (error: any) {
      console.error("Erro detalhado:", error);
      let errorMsg = "❌ Erro ao processar solicitação.\n\n";
      
      if (error.message.includes("429")) {
        errorMsg += "API Gemini está sobrecarregada.\n";
        errorMsg += "Hugging Face também falhou. Aguarde alguns minutos e tente novamente.";
      } else if (error.message.includes("fetch") || error.message.includes("network")) {
        errorMsg += "Erro de rede. Verifique sua conexão com a internet.";
      } else {
        errorMsg += error.message || "Erro desconhecido. Tente novamente mais tarde.";
      }
      
      setOutputText(errorMsg);
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