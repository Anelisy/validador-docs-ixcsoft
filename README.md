# Validador de Documentação IXC Soft

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://anelisy.github.io/validador-docs-ixcsoft/)
[![IXC Soft](https://img.shields.io/badge/IXC-Soft-blue)](https://ixcsoft.com)

> Plataforma especializada em validação e geração automática de documentação técnica para sistemas de gestão.

## 🚀 Acesso ao Site

**🌐 Site Online:** [https://anelisy.github.io/validador-docs-ixcsoft/](https://anelisy.github.io/validador-docs-ixcsoft/)

## ✨ Funcionalidades

### 📋 Validação de Documentação
- **Análise automática** de qualidade da documentação
- **Extração inteligente** de campos de API
- **Score de qualidade** com recomendações
- **Detecção de problemas** e inconsistências

### 🤖 Geração de Documentação
- **Criação automática** a partir de cards/issues
- **Inferência de módulos** e estruturas
- **Formatação padronizada** seguindo melhores práticas
- **Extração de campos** e parâmetros

### 🎯 Características Técnicas
- ⚡ **Processamento offline** com fallback inteligente
- 🔒 **Segurança** e privacidade dos dados
- 📱 **Interface responsiva** para desktop e mobile
- 🎨 **Design moderno** com tema dark profissional

## 🏗️ Arquitetura

```
├── Frontend (React + Vite)
│   ├── GitHub Pages (produção)
│   ├── Interface moderna com shadcn/ui
│   └── Suporte offline com mock inteligente
│
├── Backend (Express + TypeScript)
│   ├── Railway (produção)
│   ├── API REST com autenticação
│   └── Integração com Gemini AI
│
└── Infraestrutura
    ├── Monorepo com pnpm workspaces
    ├── CI/CD automatizado
    └── Deploy automático
```

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **shadcn/ui** + Tailwind CSS
- **React Query** para estado
- **Lucide Icons** para ícones

### Backend
- **Express.js** com TypeScript
- **Zod** para validação
- **Drizzle ORM** + SQLite
- **Pino** para logging
- **Gemini AI** para processamento

### Infraestrutura
- **Railway** para backend
- **GitHub Pages** para frontend
- **GitHub Actions** para CI/CD
- **pnpm** para gerenciamento de pacotes

## 🚀 Como Usar

### 1. Acesse o Site
Visite: [https://anelisy.github.io/validador-docs-ixcsoft/](https://anelisy.github.io/validador-docs-ixcsoft/)

### 2. Validação de Documentação
1. Cole sua documentação no campo "Documentação"
2. Opcionalmente, especifique o módulo
3. Clique em "Validar Documentação"
4. Veja o score e recomendações

### 3. Geração de Documentação
1. Cole o conteúdo do seu card/issue
2. Opcionalmente, especifique o módulo
3. Clique em "Gerar Documentação"
4. Copie a documentação gerada

## 📊 Status do Projeto

### ✅ Implementado
- [x] Interface web responsiva
- [x] Validação de documentação offline
- [x] Geração de documentação com IA
- [x] Deploy automático no GitHub Pages
- [x] Design profissional IXC Soft
- [x] Suporte a múltiplos módulos

### 🔄 Em Desenvolvimento
- [ ] API backend em produção
- [ ] Integração com Gemini AI online
- [ ] Autenticação de usuários
- [ ] Histórico de validações
- [ ] Export para múltiplos formatos

### 📋 Planejado
- [ ] Dashboard administrativo
- [ ] Relatórios de qualidade
- [ ] Integração com Jira/Confluence
- [ ] API pública para integrações

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📞 Contato

**IXC Soft**
- Website: [ixcsoft.com](https://ixcsoft.com)
- Email: suporte@ixcsoft.com
- Telefone: +55 (11) 9999-9999

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

**Desenvolvido com ❤️ pela equipe IXC Soft**