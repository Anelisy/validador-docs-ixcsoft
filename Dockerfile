FROM node:20-alpine

WORKDIR /app

# Instala pnpm
RUN npm install -g pnpm

# Copia arquivos de dependência
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json artifacts/api-server/
COPY lib ./lib
COPY tsconfig.base.json tsconfig.json ./

# Instala dependências
RUN pnpm install --frozen-lockfile

# Copia código fonte
COPY . .

# Build do API server
WORKDIR /app/artifacts/api-server
RUN pnpm run build

# Expose porta
EXPOSE 3000

# Start
ENV NODE_ENV=production
ENV PORT=3000
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
