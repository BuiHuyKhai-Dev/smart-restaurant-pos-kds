# ==========================================
# Dockerfile cho NestJS Backend
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Cài đặt OpenSSL cho Prisma
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --legacy-peer-deps

COPY . .

# Generate Prisma Client & Build
RUN npx prisma generate
RUN npm run build

# Stage chạy Production
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 4000

CMD ["node", "dist/main"]
