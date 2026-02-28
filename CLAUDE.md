# Marczelloo Tools

> Production-grade modular utility platform. Clean architecture. No chaos.

## Quick Start

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # Lint code
```

**Package Manager:** pnpm (required)

## Tech Stack

Next.js 15, React 19, TypeScript, Tailwind CSS, Zod

## Folder Structure

```
/app
  /(landing)              # Public marketing page
  /(app)                  # Main app route group
  /api/tools/[tool]/      # Tool API endpoints
  /api/download/[tool]/   # File download handler
  /app/{category}/{tool}/ # Tool pages (note: double "app")
  /globals.css            # Design tokens, slider styles

/components
  /layout/                # AppShell, sidebar, tool-content-renderer
  /tool-ui/               # FileDropZone, reusable tool components
  /ui/                    # Base UI components

/lib
  /security/upload.ts     # Upload validation (REQUIRED for all uploads)
  /ffmpeg/runner.ts       # FFmpeg wrapper
  /featureFlags.ts        # Tool registry (ADD NEW TOOLS HERE)
  /tool-navigation-context.tsx
```

## Adding a New Tool

1. **API Route** (`/app/api/tools/[tool-id]/route.ts`)
   - Use `processUpload()` from `@/lib/security/upload`
   - Validate with Zod
   - Add to `TOOL_DIRECTORIES` in download route

2. **Page Component** (`/app/app/[category]/[tool-id]/page.tsx`)
   - Use `PageHeader`, `Surface`, `Container`
   - Monochrome colors only

3. **Register in 4 places:**
   - `/lib/featureFlags.ts` → `toolRegistry`
   - `/components/layout/tool-content-renderer.tsx` → `toolComponents`
   - `/components/layout/sidebar.tsx` → `toolIconMap`
   - `/app/api/download/[tool]/[filename]/route.ts` → `TOOL_DIRECTORIES`

## Design System (MONOCHROME ONLY)

**NO COLORS.** Use black, white, zinc grays only.

| Element        | Class              |
|----------------|--------------------|
| Background     | `bg-black`         |
| Elevated       | `bg-zinc-950`      |
| Cards          | `bg-zinc-900`      |
| Primary Text   | `text-white`       |
| Secondary Text | `text-zinc-400`    |
| Muted Text     | `text-zinc-500`    |
| Borders        | `border-white/10`  |
| Hover          | `hover:bg-white/5` |

**Buttons:**
- Primary: `bg-white text-black hover:bg-zinc-200`
- Secondary: `bg-transparent border border-white/10 text-zinc-400 hover:bg-white/5`

**Icons:** Use `lucide-react` only. No emojis. Stroke width 1.5.

**Motion:** Fade only (150-250ms). No bounce/floating animations.

## File Upload Pattern

```tsx
import { processUpload, DEFAULT_UPLOAD_CONFIGS } from "@/lib/security/upload";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.image,
  allowedMimeTypes: ["image/png", "image/jpeg"],
  allowedExtensions: ["png", "jpg", "jpeg"],
  uploadDir: "./tmp/uploads/my-tool",
  maxSizeBytes: 50 * 1024 * 1024,
};

const result = await processUpload(file, UPLOAD_CONFIG);
```

## FFmpeg Usage

```tsx
import { runFFmpeg, validateInputFile } from "@/lib/ffmpeg/runner";

await validateInputFile(inputPath);
const result = await runFFmpeg(["-y", "-i", inputPath, outputPath], {
  timeout: 2 * 60 * 1000,
  workDir: "./tmp/ffmpeg",
});
```

## Navigation Architecture

Dual routing system:
1. **Direct URL** - Next.js renders page directly
2. **Sidebar SPA** - `ToolNavigationProvider` syncs URL, `ToolContentRenderer` loads dynamically

Key context: `useToolNavigation()` provides `currentTool`, `isViewingTool`, `navigateToTool()`

## Security Rules

- Always use `processUpload()` - never trust client validation
- UUID filenames only (never original names)
- Files only in `/tmp` directory
- No shell interpolation in FFmpeg commands

## Code Quality

- Strict TypeScript (no `any`)
- Zod validation on all API inputs
- No business logic in React components
- Use FFmpeg wrapper, never raw `child_process`

## Common Gotchas

1. **Double "app" path:** `/app/app/{category}/{tool}/` is correct (route groups)
2. **Tool not showing:** Must register in all 4 places
3. **Slider styling:** Use `globals.css`, don't style manually
4. **Accent field:** Only for sidebar icons, not UI styling
5. **Performance:** Max 200MB files, 5min processing, 2 concurrent jobs
