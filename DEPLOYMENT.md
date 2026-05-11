# 🚀 Guia de Deployment para Validador Docs

## 1. Deployment da API (Railway)

### Pré-requisitos:
- Conta no [Railway.app](https://railway.app)
- GitHub conectado ao Railway

### Passos:

1. **Acesse o Railway**
   - Vá para https://railway.app

2. **Crie um novo projeto**
   - Clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Autorize e selecione `Anelisy/validador-docs-ixcsoft`

3. **Configure a variável de ambiente**
   - Na aba "Variables", adicione:
     ```
     PORT=3000
     NODE_ENV=production
     ```

4. **Configure o comando de build e start**
   - Build Command: `pnpm install && pnpm --filter @workspace/api-server run build`
   - Start Command: `node --enable-source-maps artifacts/api-server/dist/index.mjs`

5. **Aguarde o deploy**
   - Railway fará o deploy automático
   - Copie a URL do seu serviço (ex: `https://validador-api.up.railway.app`)

6. **Atualize a URL da API no Frontend**
   - Edite `artifacts/mockup-sandbox/.env.production`
   - Substitua `VITE_API_URL=https://validador-api.up.railway.app/api` pela sua URL atual
   - Push para GitHub

---

## 2. Deployment do Frontend (GitHub Pages)

✅ **Já está configurado automaticamente!**

- Push para a branch `main`
- GitHub Actions fará o build e deploy
- Site será publicado em: `https://anelisy.github.io/validador-docs-ixcsoft/`

---

## 3. Configuração de CORS

A API está configurada para aceitar requisições de qualquer origem:

```typescript
app.use(cors());
```

---

## 4. Variáveis de Ambiente da API

| Variável | Valor | Obrigatório |
|----------|-------|------------|
| `PORT` | `3000` (ou qualquer porta) | ✅ Sim |
| `NODE_ENV` | `production` | ✅ Sim |

---

## 5. Endpoints Disponíveis

### Health
- `GET /api/health` - Verificar se a API está ativa

### Autenticação (sem autenticação)
- `GET /api/auth/status` - Verificar status de usuários
- `POST /api/auth/login` - Fazer login

### Validação (requer autenticação)
- `POST /api/validator/validate` - Validar documentação
- `POST /api/validator/generate` - Gerar documentação

### Campos
- `GET /api/fields` - Listar campos
- `POST /api/fields` - Criar campo

### Módulos
- `GET /api/modules` - Listar módulos
- `POST /api/modules` - Criar módulo

### Gemini AI
- `POST /api/gemini/analyze` - Análise com IA
- `POST /api/gemini/generate` - Geração com IA

---

## 6. Testando Localmente

```bash
# Terminal 1: API Server
cd artifacts/api-server
PORT=3000 pnpm run dev

# Terminal 2: Frontend
cd artifacts/mockup-sandbox
VITE_API_URL=http://localhost:3000/api pnpm run dev
```

---

## 7. Monitorar o Deploy

- **Railway Dashboard**: https://railway.app/dashboard
- **Logs em tempo real**: Clique no seu projeto > Logs
- **GitHub Actions**: Veja o status em https://github.com/Anelisy/validador-docs-ixcsoft/actions

---

## 8. Troubleshooting

### A API retorna 503 (Service Unavailable)
- Verifique se `PORT` está definida
- Verifique logs no Railway

### CORS Error (tela branca)
- Verifique se a URL da API em `.env.production` está correta
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Force refresh (Ctrl+Shift+R)

### API não é encontrada
- Aguarde 2-3 minutos para o deploy completar
- Teste a URL diretamente: `https://seu-api.up.railway.app/api/health`

