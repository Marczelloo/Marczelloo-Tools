"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";

type UuidVersion = "v4" | "v1";

const UUID_VERSIONS: readonly FormatOption[] = [
  { value: "v4", label: "UUID v4", desc: "Random" },
  { value: "v1", label: "UUID v1", desc: "Time-based" },
] as const;

function generateUuidV4(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateUuidV1(): string {
  const randomBytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(randomBytes);
  else for (let i = 0; i < randomBytes.length; i++) randomBytes[i] = Math.floor(Math.random() * 256);

  // UUID v1 timestamps are 100ns intervals since 1582-10-15.
  const timestamp = (BigInt(Date.now()) + BigInt("12219292800000")) * BigInt("10000");
  const timeLow = Number(timestamp & BigInt("0xffffffff")).toString(16).padStart(8, "0");
  const timeMid = Number((timestamp >> BigInt("32")) & BigInt("0xffff")).toString(16).padStart(4, "0");
  const timeHigh = (Number((timestamp >> BigInt("48")) & BigInt("0x0fff")) | 0x1000).toString(16).padStart(4, "0");
  const clockSequence = (((randomBytes[0] ?? 0) << 8) | (randomBytes[1] ?? 0)) & 0x3fff;
  const clock = (clockSequence | 0x8000).toString(16).padStart(4, "0");
  randomBytes[2] = (randomBytes[2] ?? 0) | 0x01; // multicast bit for a random node ID
  const node = Array.from(randomBytes.slice(2, 8), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${timeLow}-${timeMid}-${timeHigh}-${clock}-${node}`;
}

function UuidGeneratorInner(): React.JSX.Element {
  const { tool } = useTool();

  const [version, setVersion] = useState<UuidVersion>("v4");
  const [count, setCount] = useState(1);
  const [uppercase, setUppercase] = useState(false);
  const [noDashes, setNoDashes] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = useCallback(() => {
    const generator = version === "v4" ? generateUuidV4 : generateUuidV1;
    const newUuids: string[] = [];

    for (let i = 0; i < count; i++) {
      let uuid = generator();
      if (uppercase) uuid = uuid.toUpperCase();
      if (noDashes) uuid = uuid.replace(/-/g, "");
      newUuids.push(uuid);
    }

    setResults(newUuids);
  }, [version, count, uppercase, noDashes]);

  const copyToClipboard = useCallback(async (uuid: string) => {
    await navigator.clipboard.writeText(uuid);
    setCopied(uuid);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const copyAll = useCallback(async () => {
    await navigator.clipboard.writeText(results.join("\n"));
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
        description="Generate unique identifiers"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            {/* Settings */}
            <div className="mb-6 space-y-4">
              <TactileFormatGrid
                options={UUID_VERSIONS}
                value={version}
                onChange={(v) => setVersion(v as UuidVersion)}
                columns={2}
              />

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Count</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) => setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-4 py-3 bg-black border border-white/10 rounded-md text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uppercase}
                    onChange={(e) => setUppercase(e.target.checked)}
                    className="rounded border-white/10 bg-black"
                  />
                  <span>Uppercase</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noDashes}
                    onChange={(e) => setNoDashes(e.target.checked)}
                    className="rounded border-white/10 bg-black"
                  />
                  <span>No dashes</span>
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <TactileButton onClick={generate} fullWidth>
              Generate {count} UUID{count > 1 ? "s" : ""}
            </TactileButton>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Generated UUIDs</h2>
                  <div className="flex gap-2">
                    <TactileButton variant="secondary" onClick={copyAll}>
                      {copied === "all" ? "Copied!" : "Copy All"}
                    </TactileButton>
                    <button
                      onClick={clearResults}
                      className="px-3 py-1.5 text-sm bg-black border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white rounded transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-white/10 rounded-md divide-y divide-white/10 max-h-80 overflow-auto">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-4 py-3 group"
                    >
                      <code className="font-mono text-sm text-white break-all">{result}</code>
                      <button
                        onClick={() => copyToClipboard(result)}
                        className={`ml-4 px-3 py-1 text-xs rounded flex-shrink-0 transition-colors ${
                          copied === result
                            ? "bg-white text-black"
                            : "bg-black border border-white/10 text-zinc-400 opacity-0 group-hover:opacity-100 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {copied === result ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function UuidGeneratorPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Generate unique identifiers",
    category: "dev",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/dev/uuid-generator",
  };

  return (
    <ToolProvider tool={tool}>
      <UuidGeneratorInner />
    </ToolProvider>
  );
}
