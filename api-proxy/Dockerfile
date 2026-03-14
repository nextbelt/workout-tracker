FROM node:22-slim

WORKDIR /app

COPY api-proxy/package.json api-proxy/package-lock.json* ./
RUN npm install

COPY api-proxy/ .
RUN npm run build
RUN npm prune --omit=dev

EXPOSE 3001

CMD ["node", "dist/index.js"]
