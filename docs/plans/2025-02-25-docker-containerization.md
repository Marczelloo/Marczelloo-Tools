# Docker Containerization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a production-ready Docker setup with dev/prod variants, including FFmpeg for media processing.

**Architecture:** Multi-stage Dockerfile for production, separate dev Dockerfile with hot-reload, Docker Compose orchestrating both modes. Uses Alpine Linux with FFmpeg installed via apk.

**Tech Stack:** Docker, Docker Compose, Node.js 20 Alpine, FFmpeg, pnpm, Next.js

---

## Task 1: Create .dockerignore File

**Files:**
- Create: `.dockerignore`

**Step 1: Create .dockerignore**

Create `.dockerignore` with content to exclude unnecessary files from build context:

```dockerignore
# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Next.js
.next/
out/
.vercel/
.turbo/

# Testing
coverage/
.nyc_output/

# Misc
.DS_Store
*.pem

# Debug
*.log
logs/

# Local files
.env*.local
.vscode/
.idea/

# Git
.git/
.gitignore

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Documentation
docs/
README.md

# Temporary files (already gitignored)
tmp/
```

**Step 2: Verify file was created**

Run: `cat .dockerignore`
Expected: Content shown above

**Step 3: Commit**

```bash
git add .dockerignore
git commit -m "chore: add dockerignore to exclude unnecessary files from build context"
```

---

## Task 2: Create Production Dockerfile

**Files:**
- Create: `Dockerfile`

**Step 1: Create multi-stage production Dockerfile**

Create `Dockerfile` with content:

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

# Install FFmpeg and system dependencies
RUN apk add --no-cache ffmpeg ffmpeg-libs

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# ============================================
# Stage 2: Build
# ============================================
FROM node:20-alpine AS builder

RUN apk add --no-cache ffmpeg ffmpeg-libs

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN pnpm build

# ============================================
# Stage 3: Runner
# ============================================
FROM node:20-alpine AS runner

RUN apk add --no-cache ffmpeg ffmpeg-libs

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create tmp directory for file uploads
RUN mkdir -p /app/tmp && chown -R nextjs:nodejs /app/tmp

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
```

**Step 2: Verify file was created**

Run: `cat Dockerfile`
Expected: Multi-stage Dockerfile content shown above

**Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat: add production dockerfile with multi-stage build"
```

---

## Task 3: Create Development Dockerfile

**Files:**
- Create: `Dockerfile.dev`

**Step 1: Create development Dockerfile**

Create `Dockerfile.dev` with content:

```dockerfile
FROM node:20-alpine

# Install FFmpeg and system dependencies
RUN apk add --no-cache ffmpeg ffmpeg-libs git

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Create tmp directory for file uploads
RUN mkdir -p /app/tmp

# Set environment
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

# Start development server with hot-reload
CMD ["pnpm", "dev"]
```

**Step 2: Verify file was created**

Run: `cat Dockerfile.dev`
Expected: Development Dockerfile content shown above

**Step 3: Commit**

```bash
git add Dockerfile.dev
git commit -m "feat: add development dockerfile with hot-reload support"
```

---

## Task 4: Create Base Docker Compose File

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create base docker-compose.yml**

Create `docker-compose.yml` with content:

```yaml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: marczelloo-tools
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      # Persist tmp directory for file processing
      - tmp-data:/app/tmp
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  tmp-data:
    driver: local
```

**Step 2: Verify file was created**

Run: `cat docker-compose.yml`
Expected: Base Docker Compose configuration shown above

**Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add base docker-compose configuration"
```

---

## Task 5: Create Development Docker Compose Override

**Files:**
- Create: `docker-compose.dev.yml`

**Step 1: Create development override file**

Create `docker-compose.dev.yml` with content:

```yaml
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: marczelloo-tools-dev
    restart: "no"
    environment:
      - NODE_ENV=development
    volumes:
      # Mount source code for hot-reload
      - .:/app
      - /app/node_modules
      - /app/.next
      # Persist tmp directory
      - tmp-data:/app/tmp
    command: ["pnpm", "dev"]
```

**Step 2: Verify file was created**

Run: `cat docker-compose.dev.yml`
Expected: Development override configuration shown above

**Step 3: Commit**

```bash
git add docker-compose.dev.yml
git commit -m "feat: add development docker-compose override with hot-reload"
```

---

## Task 6: Configure Next.js for Standalone Output

**Files:**
- Modify: `next.config.ts`

**Step 1: Add standalone output configuration**

Edit `next.config.ts` to add `output: 'standalone'`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,

  // Standalone output for Docker
  output: "standalone",

  // Increase body size limit for large file uploads (videos, etc.)
  experimental: {
    // Allow up to 250MB for API route body size
    middlewareClientMaxBodySize: "250mb",
    proxyClientMaxBodySize: "250mb",
  },

  // API route configuration
  serverExternalPackages: ["fluent-ffmpeg"],
};

export default nextConfig;
```

**Step 2: Verify configuration is correct**

Run: `cat next.config.ts`
Expected: File contains `output: "standalone"` and updated proxy config

**Step 3: Commit**

```bash
git add next.config.ts
git commit -m "chore: configure next.js for standalone docker output"
```

---

## Task 7: Create Environment Example File

**Files:**
- Create: `.env.docker.example`

**Step 1: Create .env.docker.example**

Create `.env.docker.example` with content:

```bash
# Node Environment
NODE_ENV=production

# Application Port
PORT=3000

# Next.js Telemetry
NEXT_TELEMETRY_DISABLED=1

# Add any additional environment variables here
# API_KEYS=your_keys_here
```

**Step 2: Verify file was created**

Run: `cat .env.docker.example`
Expected: Environment variable template shown above

**Step 3: Commit**

```bash
git add .env.docker.example
git commit -m "chore: add docker environment variables example"
```

---

## Task 8: Create README for Docker Usage

**Files:**
- Create: `docs/DOCKER.md`

**Step 1: Create Docker documentation**

Create `docs/DOCKER.md` with content:

```markdown
# Docker Setup

This project includes full Docker support with separate configurations for development and production.

## Prerequisites

- Docker (version 20.10 or later)
- Docker Compose (version 2.0 or later)

## Development Mode

Development mode enables hot-reload by mounting your source code into the container.

### Start the development container:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Stop the development container:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### View logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f app
```

The application will be available at http://localhost:3000

## Production Mode

Production mode builds an optimized multi-stage Docker image.

### Build and start:

```bash
docker compose up --build -d
```

### Stop:

```bash
docker compose down
```

### View logs:

```bash
docker compose logs -f app
```

### Rebuild after code changes:

```bash
docker compose up --build -d
```

## Included Features

- **FFmpeg:** Pre-installed for media processing
- **Alpine Linux:** Minimal base image for smaller size
- **Non-root user:** Runs as `nextjs` user for security
- **Health checks:** Automatic container health monitoring
- **Persistent storage:** `/app/tmp` volume for file uploads

## Environment Variables

Copy `.env.docker.example` to `.env` and customize:

```bash
cp .env.docker.example .env
```

Then load in docker-compose.yml:

```yaml
services:
  app:
    env_file:
      - .env
```

## Container Details

| Setting | Development | Production |
|---------|-------------|------------|
| Base Image | node:20-alpine | node:20-alpine |
| FFmpeg | Yes | Yes |
| Hot Reload | Yes | No |
| Source Mounted | Yes | No |
| Image Size | ~800MB | ~400MB |
| Restart Policy | no | unless-stopped |
```

**Step 2: Verify file was created**

Run: `cat docs/DOCKER.md`
Expected: Docker documentation shown above

**Step 3: Commit**

```bash
git add docs/DOCKER.md
git commit -m "docs: add docker setup documentation"
```

---

## Task 9: Build and Test Production Image

**Files:**
- Test: Build locally

**Step 1: Build production image**

Run: `docker build -t marczelloo-tools:latest .`

Expected: Build completes successfully with multi-stage output

**Step 2: Verify image size**

Run: `docker images marczelloo-tools`

Expected: Image size around 400-500MB

**Step 3: Test run production container**

Run: `docker run -p 3000:3000 --rm marczelloo-tools:latest`

Expected: Server starts on port 3000

**Step 4: Verify FFmpeg is available**

In another terminal, run:
```bash
docker exec $(docker ps -q -f ancestor=marczelloo-tools:latest) ffmpeg -version
```

Expected: FFmpeg version output

**Step 5: Stop test container**

Press Ctrl+C in the terminal running the container

**No commit needed** - this is testing only

---

## Task 10: Build and Test Development Image

**Files:**
- Test: Build locally

**Step 1: Build development image**

Run: `docker build -f Dockerfile.dev -t marczelloo-tools:dev .`

Expected: Build completes successfully

**Step 2: Test development container with volume mount**

Run: `docker run -p 3000:3000 -v "%cd%:/app" -v "/app/node_modules" --rm marczelloo-tools:dev`

Note: On Linux/Mac, use `$(pwd)` instead of `%cd%`

Expected: Dev server starts with hot-reload enabled

**Step 3: Verify hot-reload works**

1. Open http://localhost:3000
2. Make a small change to a component file
3. Verify the browser refreshes with changes

Expected: Changes appear automatically

**Step 4: Stop test container**

Press Ctrl+C

**No commit needed** - this is testing only

---

## Task 11: Test Docker Compose Production

**Files:**
- Test: Full compose stack

**Step 1: Start production stack**

Run: `docker compose up --build -d`

Expected: Container starts successfully

**Step 2: Check container health**

Run: `docker compose ps`

Expected: Container shows as "healthy"

**Step 3: Test application**

Run: `curl http://localhost:3000`

Expected: HTML response from the application

**Step 4: Check logs**

Run: `docker compose logs app`

Expected: No error messages, server listening on port 3000

**Step 5: Stop stack**

Run: `docker compose down`

Expected: Container stopped and removed

**No commit needed** - this is testing only

---

## Task 12: Test Docker Compose Development

**Files:**
- Test: Full dev compose stack

**Step 1: Start development stack**

Run: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`

Expected: Container starts with dev server

**Step 2: Verify hot-reload in compose**

1. Open http://localhost:3000
2. Make a change to a component file
3. Verify browser refreshes automatically

Expected: Hot-reload working

**Step 3: Stop development stack**

Press Ctrl+C or run:
`docker compose -f docker-compose.yml -f docker-compose.dev.yml down`

Expected: Container stopped

**No commit needed** - this is testing only

---

## Task 13: Update Main README

**Files:**
- Modify: `README.md`

**Step 1: Add Docker section to README**

Add a Docker section to the existing README.md (create or append):

```markdown
## Docker

See [docs/DOCKER.md](docs/DOCKER.md) for complete Docker setup instructions.

Quick start:

```bash
# Development with hot-reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production
docker compose up --build -d
```
```

**Step 2: Verify README was updated**

Run: `cat README.md` (or check the Docker section exists)

Expected: Docker section present in README

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add docker quick start to readme"
```

---

## Summary

After completing all tasks, you will have:

- Production-ready multi-stage Dockerfile
- Development Dockerfile with hot-reload
- Docker Compose configurations for both modes
- FFmpeg pre-installed in containers
- Complete documentation
- Tested and verified setup

### Quick Commands

**Dev:**
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Prod:**
```bash
docker compose up --build -d
```
