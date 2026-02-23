"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

type UuidVersion = "v4" | "v1";

interface GeneratedUuid {
  value: string;
  version: UuidVersion;
  timestamp: Date;
}

// ============================================================================
// UUID GENERATION
// ============================================================================

function generateUuidV4(): string {
  // Crypto-based UUID v4 generation
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateUuidV1(): string {
  // Simplified UUID v1-like generation (time-based)
  const now = Date.now();
  const random = Math.random().toString(16).slice(2, 10);
  const timeHex = now.toString(16).padStart(12, "0");
  return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-1xxx-yxxx-${random}xxxxxx`.replace(
    /[xy]/g,
    (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }
  );
}

// ============================================================================
// UUID GENERATOR COMPONENT
// ============================================================================

function UuidGeneratorInner(): React.JSX.Element {
  const { tool } = useTool();
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [count, setCount] = useState(1);
  const [uppercase, setUppercase] = useState(false);
  const [noDashes, setNoDashes] = useState(false);
  const [results, setResults] = useState<GeneratedUuid[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = useCallback(() => {
    const generator = version === "v4" ? generateUuidV4 : generateUuidV1;
    const newUuids: GeneratedUuid[] = [];

    for (let i = 0; i < count; i++) {
      let uuid = generator();

      if (uppercase) {
        uuid = uuid.toUpperCase();
      }

      if (noDashes) {
        uuid = uuid.replace(/-/g, "");
      }

      newUuids.push({
        value: uuid,
        version,
        timestamp: new Date(),
      });
    }

    setResults(newUuids);
  }, [version, count, uppercase, noDashes]);

  const copyToClipboard = useCallback(async (uuid: string) => {
    await navigator.clipboard.writeText(uuid);
    setCopied(uuid);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const copyAll = useCallback(async () => {
    const allUuids = results.map((r) => r.value).join("\n");
    await navigator.clipboard.writeText(allUuids);
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  }, [results]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "UUID Generator"}
        description="Generate unique identifiers (UUID/GUID)"
        accent="blue"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            {/* Settings Section */}
            <fieldset className="mb-6">
              <legend className="text-lg font-semibold text-content-primary mb-4">
                Generation Settings
              </legend>

              <div className="space-y-4">
                {/* UUID Version */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    UUID Version
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "v4" as const, label: "UUID v4", desc: "Random" },
                      { value: "v1" as const, label: "UUID v1", desc: "Time-based" },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setVersion(opt.value)}
                        className={`px-4 py-3 rounded-md text-sm transition-colors-fast ${
                          version === opt.value
                            ? "bg-accent-blue text-background-primary"
                            : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                        }`}
                      >
                        <span className="font-medium">{opt.label}</span>
                        <span className="block text-xs opacity-75">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Count */}
                <div>
                  <label className="block text-sm text-content-secondary mb-2">
                    Number of UUIDs
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={count}
                    onChange={(e) => setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary"
                  />
                </div>

                {/* Format Options */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-content-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={uppercase}
                      onChange={(e) => setUppercase(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span>Uppercase</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-content-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noDashes}
                      onChange={(e) => setNoDashes(e.target.checked)}
                      className="rounded border-border"
                    />
                    <span>No dashes</span>
                  </label>
                </div>
              </div>
            </fieldset>

            {/* Generate Button */}
            <button
              onClick={generate}
              className="w-full px-6 py-3 bg-accent-blue text-background-primary font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              Generate {count} UUID{count > 1 ? "s" : ""}
            </button>

            {/* Results */}
            {results.length > 0 && (
              <fieldset className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <legend className="text-lg font-semibold text-content-primary">
                    Generated UUIDs
                  </legend>
                  <div className="flex gap-2">
                    <button
                      onClick={copyAll}
                      className={`px-3 py-1.5 text-sm rounded transition-colors-fast ${
                        copied === "all"
                          ? "bg-accent-green text-background-primary"
                          : "text-content-secondary hover:text-content-primary"
                      }`}
                    >
                      {copied === "all" ? "Copied!" : "Copy All"}
                    </button>
                    <button
                      onClick={clearResults}
                      className="px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary transition-colors-fast"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="bg-surface-muted rounded-md divide-y divide-border max-h-80 overflow-auto">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-4 py-3 group"
                    >
                      <code className="font-mono text-sm text-content-primary break-all">
                        {result.value}
                      </code>
                      <button
                        onClick={() => copyToClipboard(result.value)}
                        className={`ml-4 px-3 py-1 text-xs rounded transition-colors-fast flex-shrink-0 ${
                          copied === result.value
                            ? "bg-accent-green text-background-primary"
                            : "bg-surface border border-border text-content-secondary opacity-0 group-hover:opacity-100 hover:bg-interactive-hover"
                        }`}
                      >
                        {copied === result.value ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  ))}
                </div>
              </fieldset>
            )}
          </Surface>
        </Container>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function UuidGeneratorPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Generate unique identifiers",
    category: "dev",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/dev/uuid-generator",
  };

  return (
    <ToolProvider tool={tool}>
      <UuidGeneratorInner />
    </ToolProvider>
  );
}
