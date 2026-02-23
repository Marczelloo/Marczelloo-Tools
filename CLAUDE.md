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

## 1. Core Architecture

This is a single **Next.js App Router** application with modular backend logic.

- No microservices for now
- No unnecessary abstraction
- Everything must be production-ready

---

## 2. Folder Structure (Mandatory)

```
/app
  /(landing)
  /(app)
  /layout.tsx
  /[category]/[tool]/page.tsx
  /api
    /tools/[tool]/route.ts
  /health
  /telemetry

/components
  /layout
  /tool-layouts
  /tool-ui
  /shared

/lib
  /tools
    /[tool-name]
      config.ts
      schema.ts
      processor.ts
      limits.ts
  /security
  /ffmpeg
  /telemetry
  /featureFlags.ts
  /utils

/tmp (gitignored)
```

> No deviation without strong reason.

---

## 3. Tool Module System (Strict Rules)

Each tool must be **isolated** and contain:

### `config.ts`

Defines:

- `id`
- `category`
- `accent`
- `layout`
- `limits`
- `enabled` flag

### `schema.ts`

- Zod validation
- No request enters processor without validation

### `processor.ts`

- Pure processing logic
- No UI code
- No request parsing
- No side effects outside defined temp directories

### `limits.ts`

Defines:

- Max file size
- Max duration
- Timeout
- Concurrency weight

---

## 4. Layout System (Dynamic but Controlled)

Allowed layout types:

- `"upload-center"`
- `"split-panel"`
- `"form-heavy"`
- `"live-playground"`

Each tool **MUST** declare layout type in config.

Layout components exist in `/components/tool-layouts/`

Rules:

- Tools inject content into standardized layout wrappers
- No custom layouts per tool
- No freestyle composition

---

## 5. Design System (MONOCHROME ONLY - CRITICAL)

### Color Palette (NO COLORS - Monochrome Only)

| Element | Tailwind Class | Hex |
|---------|---------------|-----|
| App Background | `bg-black` | `#000000` |
| Elevated Surfaces | `bg-zinc-950` | `#09090B` |
| Cards/Panels | `bg-zinc-900` | `#18181B` |
| Primary Text | `text-white` | `#FFFFFF` |
| Secondary Text | `text-zinc-400` | `#A1A1AA` |
| Muted Text | `text-zinc-500` | `#71717A` |
| Borders | `border-white/10` | - |
| Hover States | `hover:bg-white/5` | - |

### Typography

- Primary: Inter, Geist, or system-ui
- Monospace: font-mono for technical data, labels, hashes
- No decorative fonts
- No gradient text

### Spacing

- **8px system only**
- No random margins

---

## 5.5 UI Design System (CRITICAL - MONOCHROME ONLY)

**ABSOLUTELY NO COLORS. NO BLUES, NO PURPLES, NO CYANS, NO GREENS, NO REDS, NO ORANGES.**

**USE ONLY: Black, White, Zinc grays, and translucent white borders.**

### Text Colors
```
text-white          - Primary text (white)
text-zinc-400       - Secondary text (silver/gray)
text-zinc-500       - Muted text (darker gray)
text-zinc-600       - Tertiary text (subtle)
```

### Backgrounds
```
bg-black            - App background (pure black)
bg-zinc-950         - Elevated surfaces (very dark gray)
bg-zinc-900         - Cards/panels (dark gray)
bg-white/5          - Hover states (faint white)
bg-white/10         - Active states
```

### Borders
```
border-white/10     - Default border (subtle)
border-white/20     - Emphasized border
border-zinc-800     - Alternative border
```

### Primary Buttons (NO ACCENT COLORS)
```
bg-white text-black hover:bg-zinc-200
```

### Secondary/Outline Buttons
```
bg-transparent border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white
```

### Error/Warning States (USE ZINC, NOT RED)
```
bg-zinc-900 border border-zinc-700 text-zinc-300
```

### Success States (USE ZINC, NOT GREEN)
```
bg-zinc-900 border border-zinc-600 text-zinc-200
```

### File Upload Area
```
border-2 border-dashed border-white/10 hover:border-white/20 bg-zinc-950
```

### Form Fieldset Pattern
```
<fieldset className="mb-6">
  <legend className="text-lg font-semibold text-white mb-4">
    1. Section Title
  </legend>
  {/* Content */}
</fieldset>
```

### Active/Selected State (NO COLORS)
```
bg-white/5 text-white border-l-2 border-white
```

### Layout Components
```
<Container size="md" className="max-w-2xl mx-auto">
  <Surface variant="elevated" padding="lg">
    {/* Tool content */}
  </Surface>
</Container>
```

---

## 6. Motion Rules (Anti AI-Slop)

### Allowed

- Fade (150–250ms)
- Subtle translate (max 10px)
- Progress animations
- Hover micro-feedback

### Forbidden

- Bounce springs
- Parallax heavy layers
- Floating blobs
- Infinite animated backgrounds
- Random particle effects
- Scroll-jank

Every animation must serve:

- Orientation
- Feedback
- Continuity
- Rare subtle delight

> If animation has no job, remove it.

---

## 7. Security Rules (Critical)

### Upload Validation

- Check MIME
- Check extension
- Enforce max size
- Generate random file names (UUID)
- Never reuse original file names

### Processing

- No shell interpolation
- Strict parameter building
- Timeout enforcement
- CPU usage controlled
- Memory guarded

### File System

- Only inside `/tmp`
- Auto-delete after 20 minutes
- Cleanup worker must run

### Rate Limiting

- Per IP
- Per tool
- Heavy tool concurrency limit

### Headers

- CSP
- X-Frame-Options
- No MIME sniff
- No open CORS

> **Security > Convenience.**

---

## 8. URL Downloader Rules (Legal Safe Mode)

UI must say:

> "Download media from public URL"

Must **NOT**:

- Mention specific platforms
- Use brand names
- Use platform logos

Must include:

> "You must have rights to download this content."

No SEO targeting specific platforms.

---

## 9. Feature Flags

Centralized in `/lib/featureFlags.ts`

Feature flags must control:

- Sidebar visibility
- Route access
- API execution

No hard-coded enabled tools.

---

## 10. Performance Limits (Raspberry Pi)

Defaults:

| Limit | Value |
|-------|-------|
| Max file size | 200MB |
| Max heavy jobs concurrent | 2 |
| Max processing time | 5 min |

- Reject unsupported codecs
- Agent must implement graceful rejection

---

## 11. Telemetry

### Allowed

- Tool usage count
- Processing time
- Error rate
- File size category

### Forbidden

- Storing user files
- Storing file content
- Storing personal data

> Telemetry must be **anonymous**.

---

## 12. SEO Rules

Each tool page must have:

- Unique title
- Unique meta description
- Proper H1
- FAQ structured data
- Canonical tag
- OpenGraph data

Landing page must:

- Contain long-form SEO section
- Internal linking to tools
- Structured layout

No keyword stuffing.

---

## 13. Monetization

AdSense placement:

- 1 top
- 1 bottom
- Never intrusive
- No popup
- No interstitial

> UI must not look spammy.

---

## 14. Code Quality Rules

### Mandatory

- Strict TypeScript
- No `any`
- No large functions
- Separation of concerns
- Pure processors
- Reusable UI components
- Zod validation everywhere

### Forbidden

- Business logic inside React components
- Hardcoded limits
- Unsafe `child_process` usage
- Unbounded loops
- Silent error swallowing

> Errors must be handled and logged.

---

## 15. Scalability Future-Proofing

Architecture must allow:

- Queue system later
- Worker extraction
- Pro tier
- API exposure
- Feature rollout

> No architectural dead ends.

---

## 16. Product Feel Intent

The platform must feel:

- Professional
- Calm
- Stable
- Intentional
- Structured

Not:

- Experimental
- Playful
- Overdesigned

> It should feel like: **"Serious online utility platform."**

---

## 17. Absolute Forbidden

- Random UI generation
- Inconsistent spacing
- Multiple design systems
- Mixing component libraries
- Inline styles chaos
- Copy-paste patterns without abstraction
- Overengineering microservices
- Storing user files long-term
- **ANY USE OF COLORS** (blue, purple, cyan, green, red, orange, etc.)
- Emojis in UI
- Colored accent states

---

## 18. Implementation Priority

1. Project setup
2. Layout + sidebar system
3. Feature flags
4. First media tool
5. Image tool
6. Dev playground tool
7. URL downloader
8. SEO + legal
9. Telemetry
10. Ads
