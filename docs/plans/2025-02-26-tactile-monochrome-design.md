# Tactile Monochrome Design System

**Date:** 2025-02-26
**Status:** Approved
**Scope:** Video Converter Page (initial), with pattern extraction for reuse

---

## Overview

A design refresh for the video converter tool that maintains the strict black/white/grey palette while introducing depth, subtle lighting, and texture to remove the "boring" flat feel.

**Design Philosophy:** Clean architecture. Controlled flexibility. No chaos.

---

## 1. Container & Layout

### Enhanced Surface Card

The main tool container uses a radial gradient to simulate spotlight illumination:

```css
background: radial-gradient(ellipse at center, #18181B 0%, #09090B 70%, #000000 100%);
```

### Border Treatment

- Top/side: `border-t border-x border-white/10` (1px subtle white)
- Bottom: No border (fades transparent)
- Shadow: `shadow-2xl shadow-black/50` for lift effect

### Step Labels

Transform from plain text to numbered badges:

```
┌─────────────┐
│  ○  Select  │  ← Number in faint grey circle
│     Video   │  ← Sharp text below
└─────────────┘
```

---

## 2. Dropzone Component

### Base State

```tsx
bg-zinc-900/50
border-2 border-dashed border-white/10
```

### Central Icon Badge

- Container: `bg-black border border-white/10 rounded-full p-4`
- Icon: Minimal cloud upload (thin stroke)
- Positioned at center of dropzone

### Interactive States

| State | Background | Border |
|-------|-----------|--------|
| Base | `bg-zinc-900/50` | `border-dashed border-white/10` |
| Hover | `bg-white/5` | `border-white/30` |
| Drag active | `bg-white/10` | `border-white/40` |
| File selected | `bg-zinc-900/50` | `border-solid border-white/15` |

### File Selected Display

- Icon badge fades out
- Filename: `text-white font-medium`
- Size: `text-zinc-500 text-sm`

---

## 3. Format Selection Grid

### Unselected "Key" State

```tsx
bg-black
border border-white/10
text-zinc-400
hover:bg-white/5 hover:border-white/20
active:scale-[0.98]
```

### Selected (Active) State

```tsx
bg-white
text-black
shadow-[0_0_20px_rgba(255,255,255,0.15)]
```

### Content Structure

- Label: `font-medium`
- Description: `block text-xs opacity-75 mt-0.5`
- Grid: `grid-cols-3 gap-2`
- Card: `px-4 py-3 rounded-md`

---

## 4. Primary CTA Button

### Disabled State (No file)

```tsx
bg-zinc-900
border border-dashed border-white/10
text-zinc-600
cursor-not-allowed
```

### Ready State (File selected)

```tsx
bg-white
text-black
font-medium
hover:bg-zinc-200
hover:-translate-y-0.5
shadow-[0_4px_20px_rgba(255,255,255,0.1)]
transition-all duration-150
```

### Loading State

```tsx
bg-zinc-800
text-zinc-400
cursor-wait
```

---

## 5. Progress Indicator

**Simplified minimal design** (no technical stats):

```
┌────────────────────────┐
│         67%            │ ← Large, light font
│  ▓▓▓▓▓▓▓▓░░░░░░░░░░░  │ ← Thin progress bar (h-1)
│      00:00:12          │ ← Time elapsed, small muted
└────────────────────────┘
```

### Styling

- Percentage: `text-3xl font-light text-white`
- Bar container: `h-1 bg-zinc-800 rounded-full`
- Bar fill: `bg-white transition-all duration-300`
- Time: `text-xs text-zinc-500`

---

## 6. Result Display

### Success Card

```tsx
bg-zinc-900/50
border border-white/10
```

### 2x2 Information Grid

| Label | Value |
|-------|-------|
| Original | filename.mp4 |
| Output Size | 45.2 MB |
| Format | MP4 |

### Download Button

- Primary white button style
- Full width
- Centered icon + "Download Video" text

---

## 7. Error Display

```tsx
bg-zinc-900/50
border border-zinc-700
text-zinc-300
```

---

## 8. Secondary Actions

### Clear Button

```tsx
bg-zinc-900
border border-white/10
text-zinc-400
hover:bg-white/5
hover:text-white
```

---

## Component Extraction Plan

After validation on video converter, extract these subcomponents for reuse:

1. **`TactileDropzone`** - Upload area with icon badge and states
2. **`TactileFormatGrid`** - Selection grid with tactile key styling
3. **`TactileButton`** - Primary/secondary button with hover effects
4. **`TactileCard`** - Surface container with radial gradient and border treatment

---

## Color Reference

| Element | Class | Hex |
|---------|-------|-----|
| Background | `bg-black` | #000000 |
| Elevated | `bg-zinc-950` | #09090B |
| Cards | `bg-zinc-900` | #18181B |
| Primary Text | `text-white` | #FFFFFF |
| Secondary Text | `text-zinc-400` | #A1A1AA |
| Muted Text | `text-zinc-500` | #71717A |
| Borders | `border-white/10` | rgba(255,255,255,0.1) |
| Hover | `hover:bg-white/5` | rgba(255,255,255,0.05) |

---

## Implementation Notes

- All animations: 150-250ms duration
- No bounce springs, no infinite animations
- Motion must have a job
- All transitions use Tailwind utility classes
- Icon set: thin-stroke Lucide icons
