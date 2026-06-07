# Imagen de producción del backend NestJS. Portable: Render / Railway / Fly / Cloudflare Containers.
FROM node:20-slim

# OpenSSL: requerido por Prisma en algunas operaciones.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1) Dependencias (incluye dev: necesarias para `nest build` y la CLI `prisma migrate`).
#    Copiamos primero el schema para que el postinstall (`prisma generate`) funcione.
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# 2) Código fuente + build.
COPY . .
RUN npm run build

ENV NODE_ENV=production
# El puerto real lo inyecta el host vía la variable PORT (la lee la config de la app).
EXPOSE 3000

# Aplica migraciones pendientes (prestart:prod) y arranca (node dist/main).
CMD ["npm", "run", "start:prod"]
