# Stage 1 - Builder
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production=false

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Stage 2 - Runtime
FROM node:20-alpine AS runtime

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

# Copy the compiled app from builder
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000

CMD [ "node", "dist/server.js" ]