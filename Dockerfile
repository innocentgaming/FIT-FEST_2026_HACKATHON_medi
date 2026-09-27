# Production Dockerfile for MediLink CARE (Backend + Static Frontend)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

# Copy built frontend assets to serve or proxy
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 8080
CMD ["node", "src/server.js"]
