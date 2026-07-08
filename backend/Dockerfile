FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app

COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src          ./src
COPY --from=builder /app/test         ./test
COPY package.json tsconfig.json tsconfig.build.json nest-cli.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
