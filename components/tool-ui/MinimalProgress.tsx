// components/tool-ui/MinimalProgress.tsx
"use client";

interface MinimalProgressProps {
  progress: number; // 0-100
  time?: string;
  remainingTime?: string; // Estimated remaining time (HH:MM:SS format)
  label?: string; // Accessibility label for screen readers
}

export function MinimalProgress({ progress, remainingTime, label }: MinimalProgressProps): React.JSX.Element {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      className="bg-zinc-900/50 border border-white/10 rounded-md p-4"
      role="progressbar"
      aria-valuenow={Math.round(clampedProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || "Loading"}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-white font-mono text-sm">{Math.round(clampedProgress)}%</span>
        {remainingTime && (
          <span className="text-zinc-400 font-mono text-xs">~{remainingTime}</span>
        )}
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
