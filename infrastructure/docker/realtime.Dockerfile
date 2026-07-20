FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 1234

CMD ["node", "dist/server/index.js"]
