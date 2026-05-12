FROM node:20-alpine
WORKDIR /app
COPY services/watchlist-service/package.json ./
RUN npm install --omit=dev
COPY services/watchlist-service/src ./src
COPY proto /proto
ENV PROTO_DIR=/proto
EXPOSE 50053
CMD ["node", "src/index.js"]
