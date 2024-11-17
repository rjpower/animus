# Build stage
FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig*.json ./
COPY webpack*.js ./
COPY static/ ./static/
COPY src/ ./src/
COPY index.html ./index.html

RUN npm run build
ENV NODE_ENV=production
ENV DATA_DIR=/data

EXPOSE 3000

CMD ["node", "dist/server.js"]