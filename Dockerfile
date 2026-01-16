# ---- Build stage (installs dev deps + runs vite/esbuild via tsx) ----
FROM node:20-bookworm-slim AS build

WORKDIR /app

# (Optional but helps when optional native deps try to compile)
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build produces: dist/public + dist/index.cjs
RUN npm run build


# ---- Runtime stage (production deps only) ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 5000
CMD ["node", "dist/index.cjs"]
