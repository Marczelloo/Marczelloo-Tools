"use client";

interface LocalProcessingSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
}

export function LocalProcessingSwitch({
  checked,
  onChange,
  disabled = false,
  description = "The file stays in your browser. Turn this off to use the server.",
}: LocalProcessingSwitchProps): React.JSX.Element {
  return (
    <label className="mb-6 flex items-start gap-3 rounded-md border border-white/10 bg-zinc-900/40 p-4 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-1 h-4 w-4 accent-white"
      />
      <span>
        <span className="block text-sm font-medium text-white">Process on this computer</span>
        <span className="block text-xs text-zinc-500 mt-1">{description}</span>
      </span>
    </label>
  );
}
