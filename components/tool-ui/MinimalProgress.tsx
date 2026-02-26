// components/tool-ui/MinimalProgress.tsx
"use client";

interface MinimalProgressProps {
  progress: number; // 0-100
  time?: string;
  remainingTime?: string; // Estimated remaining time (HH:MM:SS format)
  label?: string; // Accessibility label for screen readers
}

export function MinimalProgress({ progress, time, remainingTime, label }: MinimalProgressProps): React.JSX.Element {
  const clampedProgress = Math.min(100, Math.max(0, progress));

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
        <p className="text-4xl font-light text-white mb-2">
          {Math.round(clampedProgress)}%
        </p>
        {remainingTime && (
          <p className="text-sm text-zinc-400 mb-4">
            ~{remainingTime} remaining
          </p>
        )}
        <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-3">
          <div
            className="bg-white h-full rounded-full transition-all duration-300"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        {time && (
          <p className="text-xs text-zinc-500">Elapsed: {time}</p>
        )}
      </div>
    </div>
  );
}
