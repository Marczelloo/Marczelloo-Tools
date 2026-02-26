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
