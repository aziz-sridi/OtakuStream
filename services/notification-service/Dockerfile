FROM node:20-alpine
WORKDIR /app
COPY services/notification-service/package.json ./
RUN npm install --omit=dev
COPY services/notification-service/src ./src
COPY proto /proto
ENV PROTO_DIR=/proto
EXPOSE 50055
CMD ["node", "src/index.js"]
