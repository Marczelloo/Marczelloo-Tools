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

  // Debug: log props received
  console.log('[MinimalProgress] Props:', { progress, remainingTime, clampedProgress });

  return (
    <div
      className="bg-zinc-900/50 border border-white/10 rounded-md p-6"
      role="progressbar"
      aria-valuenow={Math.round(clampedProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || "Loading"}
    >
      <div className="text-center">
        <p className="text-4xl font-light text-white font-mono mb-2 tabular-nums">
          {Math.round(clampedProgress)}%
        </p>
        {remainingTime && (
          <p className="text-sm text-zinc-400 mb-4 font-mono tabular-nums">
            ~{remainingTime} remaining
          </p>
        )}
        <div className="w-full bg-white/5 border border-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-white h-full rounded-full transition-all duration-300 animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.3)]"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
