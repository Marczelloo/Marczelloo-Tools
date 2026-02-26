# Marczelloo Tools

**Type:** Production-Grade Modular Online Utility Platform

---

## 0. Product Philosophy

Marczelloo Tools is not a collection of random utilities. It is a:

- Modular
- Scalable
- Secure
- Minimal but powerful
- Consumer-friendly
- Production-grade

utility platform built under `tools.marczelloo.dev`.

The product must:

- Feel large, structured, and intentional
- Never look AI-generated
- Never feel like a template clone
- Never compromise security

Every decision must align with:

> **Clean architecture. Controlled flexibility. No chaos.**

---

## 1. Quick Start

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
pnpm lint             # Lint code
pnpm typecheck        # TypeScript check
```

**Package Manager:** pnpm (required)

---

## 2. Core Architecture

This is a single **Next.js App Router** application with:

- No microservices for now
- No unnecessary abstraction
- Everything production-ready

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Zod

---

## 3. Folder Structure (Actual)

```
/app
  /(landing)          # Public marketing page
  /(app)              # Main app route group
    /layout.tsx       # App layout with AppShell
    /page.tsx         # Dashboard homepage
  /api
    /tools/[tool]/route.ts       # Tool API endpoints
    /download/[tool]/[filename]  # File download handler
  /app                # Tool page components (note: double "app")
    /{category}/{tool}/page.tsx
  /globals.css        # Design tokens, slider styles
  /layout.tsx         # Root layout

/components
  /layout
    AppShell.tsx           # Main layout wrapper
    tool-content-renderer.tsx  # Dynamic tool loading
    sidebar.tsx            # Navigation sidebar
    page-header.tsx        # Page header component
  /tool-layouts/           # Layout wrappers (upload-center, etc.)
  /tool-ui/                # Reusable tool components
  /ui/                     # Base UI components
  /shared/                 # Shared components

/lib
  /security/upload.ts      # Upload validation middleware
  /ffmpeg
    runner.ts              # FFmpeg wrapper
    config.ts              # Codec configurations
  /featureFlags.ts         # Tool registry (ADD NEW TOOLS HERE)
  /tool-navigation-context.tsx   # Route sync for SPA navigation
  /tool-context.tsx        # Theme/accent context
  /utils.ts                # Utility functions (cn, etc.)

/tmp (gitignored)         # Temporary file storage
```

---

## 4. Tool Implementation Pattern

### Adding a New Tool

**1. Create API Route** (`/app/api/tools/[tool-id]/route.ts`)

- Handle file upload via `processUpload()` from `@/lib/security/upload`
- Validate with Zod
- Process with FFmpeg or other logic
- Return `{ success: true, conversion: {...} }` or error
- Add to `TOOL_DIRECTORIES` in download route

**2. Create Page Component** (`/app/app/[category]/[tool-id]/page.tsx`)

- Use `PageHeader`, `Surface`, `Container` from `@/components/layout`
- Use monochrome colors only (see Section 6)
- Export default with `ToolProvider` wrapper

**3. Register Tool** (in `/lib/featureFlags.ts`)

- Add to `toolRegistry` array with `ToolDefinition`

**4. Add to Renderer** (in `/components/layout/tool-content-renderer.tsx`)

- Add dynamic import to `toolComponents` map

**5. Add Sidebar Icon** (in `/components/layout/sidebar.tsx`)

- Add to `toolIconMap`

**6. Add Download Support** (in `/app/api/download/[tool]/[filename]/route.ts`)

- Add to `TOOL_DIRECTORIES`
- Add MIME type if needed

### File Upload Pattern

```tsx
import { processUpload, DEFAULT_UPLOAD_CONFIGS } from "@/lib/security/upload";

const UPLOAD_CONFIG = {
  ...DEFAULT_UPLOAD_CONFIGS.image,
  allowedMimeTypes: ["image/png", "image/jpeg"],
  allowedExtensions: ["png", "jpg", "jpeg"],
  uploadDir: "./tmp/uploads/my-tool",
  maxSizeBytes: 50 * 1024 * 1024,
};

const uploadResult = await processUpload(file, UPLOAD_CONFIG);
// Returns: { filename, filepath, originalName, mimeType, size }
```

---

## 5. Navigation Architecture

**Dual Routing System:**

1. **Direct URL Access** (`/app/image/image-converter`)
   - Next.js renders the page component directly
   - Used for fresh page loads, bookmarks, sharing

2. **Sidebar Navigation** (SPA-style)
   - `ToolNavigationProvider` syncs `currentTool` with URL via `usePathname()`
   - `ToolContentRenderer` dynamically loads tool components
   - Prevents double-rendering when on tool routes

**Key Context:** `useToolNavigation()` from `@/lib/tool-navigation-context`

- `currentTool`: Currently active tool (synced with URL)
- `isViewingTool`: Boolean for conditional rendering
- `navigateToTool(id)`: Sidebar click handler

---

## 6. Design System (MONOCHROME ONLY)

**ABSOLUTELY NO COLORS.** Use only black, white, zinc grays.

### Color Palette

| Element        | Class              | Hex                    |
| -------------- | ------------------ | ---------------------- |
| Background     | `bg-black`         | #000000                |
| Elevated       | `bg-zinc-950`      | #09090B                |
| Cards          | `bg-zinc-900`      | #18181B                |
| Primary Text   | `text-white`       | #FFFFFF                |
| Secondary Text | `text-zinc-400`    | #A1A1AA                |
| Muted Text     | `text-zinc-500`    | #71717A                |
| Borders        | `border-white/10`  | rgba(255,255,255,0.1)  |
| Hover          | `hover:bg-white/5` | rgba(255,255,255,0.05) |

### Primary Buttons

```tsx
className = "bg-white text-black hover:bg-zinc-200";
```

### Secondary Buttons

```tsx
className = "bg-transparent border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white";
```

### Error/Success States (USE ZINC, NOT COLORS)

```tsx
// Error
className = "bg-zinc-900 border border-zinc-700 text-zinc-300";
// Success
className = "bg-zinc-900 border border-zinc-600 text-zinc-200";
```

### Range Sliders

Use global CSS in `app/globals.css` - no inline styling needed. Sliders are monochrome by default.

---

## 7. Security Rules

### Upload Validation (Required)

```ts
import { processUpload, DEFAULT_UPLOAD_CONFIGS } from "@/lib/security/upload";

// Must specify:
- allowedMimeTypes (whitelist)
- allowedExtensions (whitelist)
- maxSizeBytes
- uploadDir (inside ./tmp)
```

### Processing Rules

- No shell interpolation
- Strict parameter building for FFmpeg
- Timeout enforcement
- UUID filenames only (never use original names)

### File System

- Only inside `/tmp`
- Auto-delete after download (handled by download route)

---

## 8. Feature Flags

**Location:** `/lib/featureFlags.ts`

**Tool Registry:**

```ts
export const toolRegistry: readonly ToolDefinition[] = [
  {
    id: "my-tool",
    name: "My Tool",
    description: "...",
    category: "image" | "media" | "document" | "web" | "dev",
    accent: "blue" | "cyan" | ... // For sidebar icon only
    layout: "upload-center" | "split-panel" | "form-heavy" | "live-playground",
    enabled: true,
    route: "/app/image/my-tool",
    maxFileSize: 50,
    new: true,  // optional "New" badge
  },
  // ...
];
```

**Helper Functions:**

- `isToolEnabled(toolId)` - Check if tool enabled
- `getToolById(id)` - Get tool config
- `getToolsByCategory(category)` - Filter by category

---

## 9. Reusable Components

### FileDropZone (`@/components/tool-ui/FileDropZone`)

```tsx
<FileDropZone
  onFileSelect={setFile}
  accept="image/png,image/jpeg"
  maxSize={50 * 1024 * 1024}
  fileType="image"
  maxFileSizeLabel="Max 50MB"
  currentFile={file}
/>
```

### Layout Components

```tsx
<Container size="md" className="max-w-2xl mx-auto">
  <Surface variant="elevated" padding="lg">
    {/* Tool content */}
  </Surface>
</Container>
```

---

## 10. FFmpeg Usage

```ts
import { runFFmpeg, validateInputFile } from "@/lib/ffmpeg/runner";

// Validate input file exists
await validateInputFile(uploadResult.filepath);

// Run FFmpeg with timeout
const result = await runFFmpeg(["-y", "-i", inputPath, "-c:v", "libwebp", outputPath], {
  timeout: 2 * 60 * 1000,
  workDir: "./tmp/ffmpeg",
});

if (!result.success) {
  // Handle error (result.timedOut, result.error, result.stderr)
}
```

---

## 11. Code Quality

**Required:**

- Strict TypeScript (no `any`)
- Zod validation on all API inputs
- Proper error handling (no silent swallowing)
- Separation of concerns (API vs UI)

**Forbidden:**

- Business logic in React components
- Hardcoded limits (use constants)
- Unsafe `child_process` (use FFmpeg wrapper)

---

## 12. Motion Rules

**Allowed:**

- Fade (150-250ms)
- Subtle translate (max 10px)
- Progress animations
- Hover micro-feedback

**Forbidden:**

- Bounce springs
- Floating blobs
- Infinite animated backgrounds

> If animation has no job, remove it.

---

## 13. URL Downloader Rules (Legal Safe Mode)

UI must say:

> "Download media from public URL"

Must include:

> "You must have rights to download this content."

No platform names, logos, or SEO targeting specific services.

---

## 14. Common Gotchas

1. **Double "app" in path:** Tool pages are at `/app/app/{category}/{tool}/` — this is correct due to Next.js route groups.

2. **Tool not showing:** After adding a tool, you must update 4 places: `featureFlags.ts`, `tool-content-renderer.tsx`, `sidebar.tsx`, and download route.

3. **Slider colors:** Don't style sliders manually — use the global CSS in `app/globals.css` for consistent monochrome styling.

4. **Accent colors:** The `accent` field in tool config is ONLY for sidebar icon reference. Don't use it for UI styling — use monochrome only.

5. **File uploads:** Always use `processUpload()` from security module. Never trust client-side validation only.

---

## 15. Performance Limits

| Limit                     | Value                         |
| ------------------------- | ----------------------------- |
| Max file size             | 200MB (configurable per tool) |
| Max processing time       | 5 minutes                     |
| Max concurrent heavy jobs | 2                             |

---

## 16. Product Feel

The platform must feel:

- Professional
- Calm
- Stable
- Intentional
- Structured

**NOT:** Experimental, playful, overdesigned

> It should feel like: "Serious online utility platform."

## 🤖 Role & Persona

You are an expert Principal UI/UX Designer and Senior Frontend Engineer specializing in React and Tailwind CSS. Your aesthetic is ultra-premium, minimalist, and highly technical. You design interfaces that look like native desktop applications (e.g., Vercel, Linear.app, Raycast), not standard websites.

## 🎨 Core Art Direction: "Tactile Monochrome"

- **The Vibe:** Ultra-dark, minimalist, professional, focused, and distraction-free.
- **Zero Color Policy:** Do NOT use any colors (no blues, purples, greens, etc.) unless strictly necessary for status (e.g., a highly muted red `text-red-500/80` for a destructive action). Rely entirely on black, white, and translucent greys.
- **Depth over Flatness:** Do not use flat, muddy grey backgrounds. Create depth using pure black backgrounds, elevated surfaces with 1px translucent white borders, subtle lighting (gradients), and glassmorphism.

## 🖌️ Exact Color & Tailwind Rules

Always map your designs to these specific Tailwind utility classes:

- **App Background:** `bg-black` (`#000000`) - The absolute bottom layer.
- **Elevated Surfaces (Cards, Modals, Sidebars):** `bg-[#0A0A0A]` or `bg-zinc-950`.
- **Interactive Surface Hover:** `hover:bg-white/5` or `hover:bg-zinc-900`.
- **Borders (Crucial for depth):** `border border-white/10` or `border-zinc-800`. Never use solid grey borders; always use opacity-based white/black.
- **Primary Text:** `text-white` or `text-zinc-100`.
- **Secondary/Muted Text:** `text-zinc-400` or `text-zinc-500`.
- **Primary Accents & CTAs:** Solid white background, black text (`bg-white text-black`). Hover state: `hover:bg-zinc-200`.

## 🔤 Typography Hierarchy

- **Main Font (Headings & Body):** Modern sans-serif (`font-sans`, Inter, Geist, or system-ui). Use tight tracking for headings (`tracking-tight`).
- **Technical/Data Font:** Monospaced (`font-mono`, JetBrains Mono). **Must be used for:**
  - File sizes, extensions (MP4, JSON).
  - Small labels, section tags, step indicators.
  - Code blocks, hashes, and configuration keys.
  - Style labels as: `text-xs font-mono uppercase tracking-widest text-zinc-500`.

## 🧩 Component Architecture Rules

**1. Cards & Containers**

- Never make them plain grey. Use `bg-[#0A0A0A] border border-white/10 rounded-xl`.
- Add subtle inner glows or outer drop shadows to lift them: `shadow-2xl shadow-black/80`.
- Use asymmetric "Bento Box" grid layouts instead of standard 3x2 grids when displaying multiple features.

**2. Buttons & Interactions**

- **Primary CTA:** `bg-white text-black font-medium rounded-lg active:scale-[0.98] hover:-translate-y-0.5 transition-all`. Add a subtle shadow to make it glow: `shadow-[0_0_15px_rgba(255,255,255,0.1)]`.
- **Secondary/Ghost:** `bg-transparent text-white border border-white/10 hover:bg-white/5 rounded-lg`.
- **Selectable Cards (like Output Formats):** Unselected state is `bg-black border border-white/10`. Selected state is `bg-white text-black border-transparent`.

**3. Inputs & Dropzones**

- Standard Inputs: `bg-black border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30`.
- File Dropzones: Must have a tactile feel. `border border-dashed border-white/20 bg-black/50 hover:bg-white/5 hover:border-white/40`. Always include a central icon badge.

**4. Iconography**

- **NO EMOJIS.** Under any circumstances.
- Use `lucide-react` exclusively.
- Keep strokes thin and elegant: `strokeWidth={1.5}` or `1.25`.
- Default icon color should be `text-zinc-400` or `text-white`.

## 🏗️ Layout & Structure (SPA Vibe)

- The application should feel like a native desktop app, built as a Single Page Application (SPA).
- Use `h-screen w-full flex overflow-hidden` for the main layout wrapper.
- Only the specific content canvas/workspace should scroll (`overflow-y-auto`); sidebars and top headers must remain fixed.

## 🛠️ Code Output Rules

- Write clean, functional React components.
- Do not write inline CSS; rely entirely on Tailwind CSS utility classes.
- When rendering dummy data or UI states, build them completely (e.g., if you design an upload component, include the state for 'dragging', 'uploading', and 'success' visually).
