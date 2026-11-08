FROM node:20-bookworm-slim

# Install Python 3 and g++ for multi-language code runner
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 g++ build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency declarations
COPY package*.json ./

# Install all dependencies required to build
RUN npm install

# Copy Prisma schema and generate Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code & configuration
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript into dist/
RUN npm run build

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/server.js"]
