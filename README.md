# Marczelloo Tools

Modular web platform with utilities for media, images, documents, developers and the web. It runs locally, in Docker, and on low-power hardware such as a Raspberry Pi.

Production URL: [tools.marczelloo.dev](https://tools.marczelloo.dev)

## Features

- Media conversion, compression, trimming and audio tools
- URL downloader with `yt-dlp`, direct media links and live progress
- Image conversion, compression, cropping and background removal
- PDF merge, split, compression, OCR and PDF-to-Word conversion
- Developer tools: UUID, JWT, regex, timestamps, colors and CSS utilities
- Web tools: QR codes, URL shortening, screenshots, hashing and Base64
- Docker-ready production and development environments
- SSRF-safe remote URL fetching and temporary-file cleanup

## Stack

- Next.js 16, React 19 and TypeScript
- Tailwind CSS and Lucide icons
- pnpm, FFmpeg, `yt-dlp`, Chromium and Poppler

## Requirements

Native development requires Node.js 20+, pnpm 10+, Python 3.10+ and FFmpeg on PATH. `yt-dlp` is required by the URL Downloader.

```bash
pnpm install
python -m pip install yt-dlp
```

On Windows:

```powershell
py -m pip install --user yt-dlp
```

The downloader detects the Python launcher automatically. If `yt-dlp` is installed elsewhere, set `YTDLP_PATH` to its executable.

## Local development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Verification commands:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Lint warnings are currently non-blocking; the command must finish with zero errors.

## Docker

The Docker images include FFmpeg, `yt-dlp`, Chromium and Poppler.

Development with hot reload:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Production:

```bash
docker compose up --build -d
```

Logs and shutdown:

```bash
docker compose logs -f app
docker compose down
```

The application listens on port `3000`. Temporary uploads and generated files are stored in `/app/tmp` through the Docker volume.

## Configuration

For Docker, copy the example environment file:

```bash
cp .env.docker.example .env
```

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | HTTP port, default `3000` |
| `YTDLP_PATH` | Optional `yt-dlp` executable path |
| `BROWSER_EXECUTABLE_PATH` | Optional Chromium/Chrome path |
| `NEXT_TELEMETRY_DISABLED` | Set to `1` to disable telemetry |

## URL Downloader

The downloader supports provider pages recognized by `yt-dlp` and direct MP4/MP3-style media URLs.

1. Check the URL and return formats or direct-file metadata.
2. Select a format.
3. Start a job and subscribe to Server-Sent Events for progress.
4. Fetch the completed file and clean up temporary data.

Remote URLs are validated before server-side requests to prevent access to private network addresses. Users are responsible for having the rights to download or convert requested content.

## Raspberry Pi and Cloudflare Tunnel

The recommended deployment is Docker Compose plus a Cloudflare Tunnel:

```bash
git clone https://github.com/Marczelloo/Marczelloo-Tools.git
cd Marczelloo-Tools
docker compose up --build -d
curl -f http://127.0.0.1:3000
docker compose ps
```

Install and authenticate `cloudflared`, then create the tunnel and DNS route:

```bash
cloudflared tunnel login
cloudflared tunnel create marczelloo-tools
cloudflared tunnel route dns marczelloo-tools tools.marczelloo.dev
```

Create `/etc/cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /etc/cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: tools.marczelloo.dev
    service: http://127.0.0.1:3000
  - service: http_status:404
```

Enable the service:

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

Never commit `.env`, Cloudflare credentials, tunnel JSON files or private SSH keys.

## Repository structure

```text
app/                  Next.js pages and API routes
components/           Shared UI, layout and icons
lib/                  Processing, security and integration helpers
public/                Brand assets and static files
docs/                 Operational documentation
Dockerfile            Production image
Dockerfile.dev        Development image
docker-compose*.yml   Docker Compose configurations
```

## Design

The visual direction is documented in [DESIGN.md](DESIGN.md). Brand assets are in `public/brand` and the icon registry is in `components/icons`.

## License

This repository is currently maintained as a private project. Add a project-specific license before redistributing it.
