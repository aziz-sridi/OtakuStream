FROM node:20-alpine
WORKDIR /app
COPY services/review-service/package.json ./
RUN npm install --omit=dev
COPY services/review-service/src ./src
COPY proto /proto
ENV PROTO_DIR=/proto
EXPOSE 50054
CMD ["node", "src/index.js"]
