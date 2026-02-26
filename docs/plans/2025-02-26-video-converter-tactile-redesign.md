# Video Converter Tactile Monochrome Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the video converter page with the Tactile Monochrome design system - introducing depth, subtle lighting, and texture while maintaining the strict black/white/grey palette.

**Architecture:** Create reusable subcomponents (`TactileDropzone`, `TactileFormatGrid`, `TactileButton`) with the enhanced visual treatments, then integrate them into the main video converter page. The subcomponents will be extracted for potential reuse across other tools.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide React icons

---

## Task 1: Create TactileDropzone Component

**Files:**
- Create: `components/tool-ui/TactileDropzone.tsx`

**Step 1: Create the component file with props interface**

```tsx
// components/tool-ui/TactileDropzone.tsx
"use client";

import { useCallback, useRef } from "react";
import { Cloud } from "lucide-react";

interface TactileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  currentFile: File | null;
  maxSizeLabel?: string;
  fileTypesLabel?: string;
}

export function TactileDropzone({
  onFileSelect,
  accept = "video/*",
  maxSize = 200 * 1024 * 1024,
  currentFile,
  maxSizeLabel = "Max 200MB",
  fileTypesLabel,
}: TactileDropzoneProps): React.JSX.Element {
  // Implementation in next step
  return <div>Dropzone</div>;
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (component compiles)

**Step 3: Implement the dropzone with all states**

```tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { Cloud, FileVideo } from "lucide-react";

interface TactileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  currentFile: File | null;
  maxSizeLabel?: string;
  fileTypesLabel?: string;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function TactileDropzone({
  onFileSelect,
  accept = "video/*",
  maxSize,
  currentFile,
  maxSizeLabel,
  fileTypesLabel,
}: TactileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const baseClasses = "border-2 rounded-lg p-8 text-center cursor-pointer transition-all duration-200";
  const stateClasses = isDragging
    ? "bg-white/10 border-white/40"
    : currentFile
    ? "bg-zinc-900/50 border-solid border-white/15"
    : "bg-zinc-900/50 border-dashed border-white/10 hover:border-white/30 hover:bg-white/5";

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${baseClasses} ${stateClasses}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {currentFile ? (
        <div className="flex items-center justify-center gap-3">
          <FileVideo className="w-5 h-5 text-zinc-400" />
          <div>
            <p className="text-white font-medium">{currentFile.name}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{formatSize(currentFile.size)}</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-center mb-4">
            <div className="bg-black border border-white/10 rounded-full p-4">
              <Cloud className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />
            </div>
          </div>
          <p className="text-zinc-300">Click to select or drop video</p>
          {fileTypesLabel && (
            <p className="text-xs text-zinc-500 mt-1">
              {fileTypesLabel} • {maxSizeLabel}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add components/tool-ui/TactileDropzone.tsx
git commit -m "feat: add TactileDropzone component with cloud icon badge

Creates reusable dropzone component with:
- Radial gradient background simulation
- Cloud upload icon in circular badge
- Hover and drag states with subtle illumination
- File selected display with icon and details

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create TactileFormatGrid Component

**Files:**
- Create: `components/tool-ui/TactileFormatGrid.tsx`

**Step 1: Create the component file**

```tsx
// components/tool-ui/TactileFormatGrid.tsx
"use client";

import { useCallback } from "react";

export interface FormatOption {
  value: string;
  label: string;
  desc: string;
}

interface TactileFormatGridProps {
  options: readonly FormatOption[];
  value: string;
  onChange: (value: string) => void;
  columns?: 3 | 4 | 5;
}

export function TactileFormatGrid({
  options,
  value,
  onChange,
  columns = 3,
}: TactileFormatGridProps): React.JSX.Element {
  const gridCols = columns === 3 ? "grid-cols-3" : columns === 4 ? "grid-cols-4" : "grid-cols-5";

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-3 rounded-md text-sm transition-all duration-150 ${
            value === option.value
              ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              : "bg-black border border-white/10 text-zinc-400 hover:bg-white/5 hover:border-white/20 active:scale-[0.98]"
          }`}
        >
          <span className="font-medium">{option.label}</span>
          <span className="block text-xs opacity-75 mt-0.5">{option.desc}</span>
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add components/tool-ui/TactileFormatGrid.tsx
git commit -m "feat: add TactileFormatGrid component

Creates reusable format selection grid with:
- Tactile 'key' design for unselected items
- White active state with subtle outer glow
- Press effect on interaction
- Configurable column count

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Create TactileButton Component

**Files:**
- Create: `components/tool-ui/TactileButton.tsx`

**Step 1: Create the component file**

```tsx
// components/tool-ui/TactileButton.tsx
"use client";

import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface TactileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

export function TactileButton({
  variant = "primary",
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...props
}: TactileButtonProps): React.JSX.Element {
  const baseClasses = "font-medium rounded-md transition-all duration-150";
  const widthClass = fullWidth ? "w-full" : "";
  const disabledAttr = disabled || loading;

  const variantClasses = {
    primary: disabledAttr
      ? "bg-zinc-900 border border-dashed border-white/10 text-zinc-600 cursor-not-allowed"
      : loading
      ? "bg-zinc-800 text-zinc-400 cursor-wait"
      : "bg-white text-black hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)]",
    secondary: disabledAttr
      ? "bg-zinc-900 border border-white/10 text-zinc-600 cursor-not-allowed"
      : "bg-zinc-900 border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white",
    ghost: disabledAttr
      ? "bg-transparent text-zinc-700 cursor-not-allowed"
      : "bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white",
  };

  return (
    <button
      disabled={disabledAttr}
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {loading ? <span className="animate-pulse">{children}</span> : children}
    </button>
  );
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add components/tool-ui/TactileButton.tsx
git commit -m "feat: add TactileButton component

Creates reusable button component with:
- Primary, secondary, and ghost variants
- Disabled state with dashed border (primary)
- Loading state with cursor-wait
- Subtle lift animation on hover (primary)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Update Surface Component with Radial Gradient

**Files:**
- Modify: `components/layout/page-header.tsx` (or wherever Surface variant="elevated" is defined)
- First, find where Surface is defined

**Step 1: Find Surface component location**

Run: `grep -r "variant.*elevated" components/ --include="*.tsx" -l`
Expected: Returns file path containing Surface component

**Step 2: Read the Surface component**

Read the file from Step 1 to understand current implementation

**Step 3: Update Surface component to support radial gradient**

Based on the found file, add a new variant or prop. Assuming Surface is in a layout file, we'll add the radial gradient class to the elevated variant:

```tsx
// In the Surface component, find the variant styles and update:
const variantStyles = {
  // ... other variants
  elevated: "bg-zinc-900 border border-white/10 shadow-xl",
  // Change to:
  elevated: "bg-[radial-gradient(ellipse_at_center,_#18181B_0%,_#09090B_70%,_#000000_100%)] border-t border-x border-white/10 shadow-2xl shadow-black/50",
};
```

**Step 4: Run typecheck and build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS

**Step 5: Commit**

```bash
git add components/layout/[filename].tsx
git commit -m "feat: add radial gradient to Surface elevated variant

Updates the elevated Surface variant with:
- Radial gradient simulating spotlight effect
- Layered border (top/side only)
- Enhanced shadow for lift effect

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Create MinimalProgress Component

**Files:**
- Create: `components/tool-ui/MinimalProgress.tsx`

**Step 1: Create the component file**

```tsx
// components/tool-ui/MinimalProgress.tsx
"use client";

interface MinimalProgressProps {
  progress: number; // 0-100
  time?: string;
}

export function MinimalProgress({ progress, time }: MinimalProgressProps): React.JSX.Element {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="bg-zinc-900/50 border border-white/10 rounded-md p-6">
      <div className="text-center">
        <p className="text-3xl font-light text-white mb-4">
          {Math.round(clampedProgress)}%
        </p>
        <div className="w-full bg-zinc-800 rounded-full h-1 mb-3">
          <div
            className="bg-white h-full rounded-full transition-all duration-300"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        {time && (
          <p className="text-xs text-zinc-500">{time}</p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add components/tool-ui/MinimalProgress.tsx
git commit -m "feat: add MinimalProgress component

Creates minimal progress indicator with:
- Large percentage display
- Thin progress bar (h-1)
- Optional elapsed time display
- No technical stats (fps, bitrate, speed)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Update Video Converter Page with New Components

**Files:**
- Modify: `app/app/media/video-converter/page.tsx`

**Step 1: Update imports**

Add the new component imports:

```tsx
import { TactileDropzone } from "@/components/tool-ui/TactileDropzone";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";
import { MinimalProgress } from "@/components/tool-ui/MinimalProgress";
```

**Step 2: Remove format types from component, move to constant**

Outside the component, define:

```tsx
const VIDEO_FORMATS: readonly FormatOption[] = [
  { value: "mp4", label: "MP4", desc: "Universal" },
  { value: "webm", label: "WebM", desc: "Web optimized" },
  { value: "mov", label: "MOV", desc: "Apple" },
  { value: "avi", label: "AVI", desc: "Legacy" },
  { value: "mkv", label: "MKV", desc: "Matroska" },
] as const;
```

**Step 3: Replace file upload section with TactileDropzone**

Find the file upload fieldset (lines 181-210) and replace with:

```tsx
{/* File Upload */}
<fieldset className="mb-6">
  <legend className="text-lg font-semibold text-white mb-4">
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
      1
    </span>
    Select Video
  </legend>
  <TactileDropzone
    onFileSelect={(selectedFile) => {
      setFile(selectedFile);
      setError(null);
      setResult(null);
      setProgress(null);
      setConversionId(null);
      setOutputFormat("mp4");
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }}
    accept="video/*"
    maxSize={200 * 1024 * 1024}
    currentFile={file}
    maxSizeLabel="Max 200MB"
    fileTypesLabel="MP4, WebM, MOV, AVI, MKV"
  />
</fieldset>
```

**Step 4: Replace format selection with TactileFormatGrid**

Find the format fieldset (lines 213-233) and replace with:

```tsx
{/* Output Format */}
<fieldset className="mb-6">
  <legend className="text-lg font-semibold text-white mb-4">
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-sm mr-2">
      2
    </span>
    Output Format
  </legend>
  <TactileFormatGrid
    options={VIDEO_FORMATS}
    value={outputFormat}
    onChange={setOutputFormat}
  />
</fieldset>
```

**Step 5: Replace progress section with MinimalProgress**

Find the progress fieldset (lines 236-267) and replace with:

```tsx
{/* Progress Bar */}
{loading && (
  <fieldset className="mb-6">
    <legend className="text-lg font-semibold text-white mb-4">
      Converting...
    </legend>
    {progress ? (
      <MinimalProgress
        progress={progress.progress}
        time={progress.time}
      />
    ) : (
      <div className="bg-zinc-900/50 border border-white/10 rounded-md p-6">
        <div className="w-full bg-zinc-800 rounded-full h-1 overflow-hidden">
          <div className="bg-white h-full rounded-full animate-pulse" style={{ width: "30%" }} />
        </div>
      </div>
    )}
  </fieldset>
)}
```

**Step 6: Replace action buttons with TactileButton**

Find the action buttons section (lines 309-339) and replace with:

```tsx
{/* Action Buttons */}
<div className="flex gap-3">
  <TactileButton
    onClick={handleConvert}
    disabled={!file || loading}
    loading={loading}
    fullWidth
  >
    {loading ? "Converting..." : "Convert Video"}
  </TactileButton>
  {file && (
    <TactileButton
      variant="secondary"
      onClick={() => {
        setFile(null);
        setResult(null);
        setError(null);
        setProgress(null);
        setConversionId(null);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }}
      disabled={loading}
    >
      Clear
    </TactileButton>
  )}
</div>
```

**Step 7: Update result display styling**

Find the result fieldset (lines 277-306) and update the container classes:

```tsx
<div className="bg-zinc-900/50 border border-white/10 rounded-md p-4">
  {/* ... rest of content ... */}
</div>
```

And update the download button:

```tsx
<TactileButton
  href={result.output.downloadUrl}
  download
  fullWidth
  as="a" // Note: you may need to add 'as' prop support or use <a> with classes
>
  Download Video
</TactileButton>
```

Or if the button doesn't support `as` prop, use anchor with tactile classes:

```tsx
<a
  href={result.output.downloadUrl}
  download
  className="block w-full px-6 py-3 bg-white text-black font-medium text-center rounded-md hover:bg-zinc-200 hover:-translate-y-0.5 shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all duration-150"
>
  Download Video
</a>
```

**Step 8: Update error display styling**

Find the error display (lines 270-274) and update:

```tsx
{error && (
  <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-700 rounded-md">
    <p className="text-zinc-300 text-sm">{error}</p>
  </div>
)}
```

**Step 9: Remove unused VIDEO_FORMATS constant**

Since we moved it outside the component, remove the old definition from inside the component (around line 161-167).

**Step 10: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 11: Build and test in browser**

Run: `pnpm build && pnpm dev`
Then visit http://localhost:3000/app/media/video-converter and verify:
- Dropzone shows cloud icon badge
- Hover states work on dropzone
- Format cards have tactile look
- Progress bar is minimal
- Buttons have proper states

**Step 12: Commit**

```bash
git add app/app/media/video-converter/page.tsx
git commit -m "feat: apply Tactile Monochrome design to video converter

Integrates new tactile components:
- TactileDropzone with cloud icon badge
- TactileFormatGrid with key-style buttons
- TactileButton with lift animation
- MinimalProgress with clean percentage display
- Enhanced step labels with number badges
- Updated result and error display styling

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Add index exports for new components

**Files:**
- Modify: `components/tool-ui/index.ts` (if exists) or create it

**Step 1: Check if index exists**

Run: `ls components/tool-ui/index.ts 2>/dev/null || echo "No index file"`

**Step 2: Create or update index file**

If file doesn't exist, create:

```tsx
// components/tool-ui/index.ts
export { TactileDropzone } from "./TactileDropzone";
export { TactileFormatGrid } from "./TactileFormatGrid";
export type { FormatOption } from "./TactileFormatGrid";
export { TactileButton } from "./TactileButton";
export { MinimalProgress } from "./MinimalProgress";
```

If file exists, add the above exports to it.

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add components/tool-ui/index.ts
git commit -m "chore: export tactile components from tool-ui index

Adds exports for new reusable tactile components.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Final Verification and Linting

**Files:**
- All modified files

**Step 1: Run linter**

Run: `pnpm lint`
Expected: No errors (warnings may be acceptable)

**Step 2: Fix any linting errors**

If there are errors, fix them and re-run.

**Step 3: Final build test**

Run: `pnpm build`
Expected: PASS with no errors

**Step 4: Manual smoke test**

1. Start dev server: `pnpm dev`
2. Visit /app/media/video-converter
3. Test each interaction:
   - Click dropzone → file picker opens
   - Select a file → dropzone shows file info
   - Click format buttons → active state applies
   - Click convert with no file → button disabled
   - Click convert with file → loading state shows
   - Clear button resets state

**Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "fix: address linting and final polish

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Testing Strategy

1. **Visual Regression**: Compare before/after screenshots at each major step
2. **Interactive Testing**: Test all hover, click, and drag states manually
3. **Accessibility**: Verify keyboard navigation works for all buttons
4. **Responsive**: Check behavior on mobile viewport (375px width)

## Notes for Future Extraction

These components are designed for reuse across other tools:
- `TactileDropzone` - can be used for any file upload tool
- `TactileFormatGrid` - can be used for any option selection
- `TactileButton` - can replace all button instances
- `MinimalProgress` - can be used for any progress display

After validation on video converter, consider extracting to a shared pattern library.
