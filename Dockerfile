# Stage 1 - Builder
FROM node:slim AS builder

WORKDIR /usr/src/app

# Copy only package.json and package-lock.json for dependency installation
COPY package*.json ./

# Install dependencies with caching
RUN npm ci --include=dev

# Copy the rest of the application files
COPY tsconfig.json ./
COPY src ./src

# Build the TypeScript application
RUN npm run build

# Stage 2 - Runtime
FROM node:slim AS runtime

WORKDIR /usr/src/app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy the compiled app from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD [ "node", "dist/server.js" ]