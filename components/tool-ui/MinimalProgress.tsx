// components/tool-ui/MinimalProgress.tsx
"use client";

interface MinimalProgressProps {
  progress: number; // 0-100
  time?: string;
  label?: string; // Accessibility label for screen readers
}

export function MinimalProgress({ progress, time, label }: MinimalProgressProps): React.JSX.Element {
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
