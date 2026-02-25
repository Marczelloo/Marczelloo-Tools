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
