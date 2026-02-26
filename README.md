# Marczelloo Tools

A production-grade modular online utility platform.

## Docker

See [docs/DOCKER.md](docs/DOCKER.md) for complete Docker setup instructions.

Quick start:

```bash
# Development with hot-reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production
docker compose up --build -d
```
