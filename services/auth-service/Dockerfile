# Build context = repo root (see docker-compose.yml)
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY services/auth-service/package.json ./
RUN npm install --omit=dev
COPY services/auth-service/src ./src
COPY proto /proto
ENV PROTO_DIR=/proto
EXPOSE 50051
CMD ["node", "src/index.js"]
