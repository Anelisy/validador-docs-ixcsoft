# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Gemini (via Replit AI Integrations - `@workspace/integrations-gemini-ai`)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── doc-validator/      # React + Vite frontend - Validador de Documentação
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── integrations-gemini-ai/  # Gemini AI integration (Replit managed)
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Application: Validador de Documentação

A ferramenta interna para validação e geração de documentação técnica.

### Features

1. **Validar Documentação**: Cola documentação existente → IA analisa e sugere melhorias, extrai campos de API, busca páginas relacionadas na wiki pública
2. **Gerar Documentação**: Cola conteúdo de card do Jira → IA gera documentação completa no padrão Outline (seguindo SKILL template)
3. **Mapa de Campos**: Visualização interativa (react-flow) mostrando hierarquia Módulo > Tabela > Campo
4. **Histórico**: Lista de validações/gerações anteriores
5. **Wiki IXC**: Busca na wiki pública https://wiki-erp.ixcsoft.com.br/documentacao/

### API Routes

- `GET /api/healthz` - Health check
- `POST /api/validator/validate` - Valida documentação existente
- `POST /api/validator/generate` - Gera documentação a partir de card Jira
- `POST /api/validator/wiki-search` - Busca na wiki pública
- `GET /api/fields` - Lista campos mapeados
- `POST /api/fields` - Cria mapeamento de campo
- `DELETE /api/fields/:id` - Remove campo
- `GET /api/fields/mindmap` - Dados do mapa mental (nodes/edges para react-flow)

### DB Schema

- `field_mappings` - Armazena campos, tabelas, módulos e descrições para mapa mental
- `conversations` / `messages` - Para chat com IA (Gemini)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all lib packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- Run codegen after changing OpenAPI spec: `pnpm --filter @workspace/api-spec run codegen`
- Push DB schema changes: `pnpm --filter @workspace/db run push`

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/`, uses `@workspace/api-zod` for validation, `@workspace/db` for persistence, `@workspace/integrations-gemini-ai` for AI.

### `artifacts/doc-validator` (`@workspace/doc-validator`)

React + Vite frontend. Uses `@xyflow/react` for mind map, `react-markdown` for doc preview, `framer-motion` for animations.

### `lib/integrations-gemini-ai` (`@workspace/integrations-gemini-ai`)

Gemini AI client via Replit AI Integrations. Uses `AI_INTEGRATIONS_GEMINI_BASE_URL` and `AI_INTEGRATIONS_GEMINI_API_KEY` env vars (auto-configured by Replit).

### `lib/db` (`@workspace/db`)

Drizzle ORM schema + DB connection. Tables: `field_mappings`, `conversations`, `messages`.
