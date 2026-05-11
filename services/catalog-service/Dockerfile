FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY services/catalog-service/package.json ./
RUN npm install --omit=dev
COPY services/catalog-service/src ./src
COPY proto /proto
ENV PROTO_DIR=/proto
EXPOSE 50052
CMD ["node", "src/index.js"]
