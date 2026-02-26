"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileButton } from "@/components/tool-ui/TactileButton";

interface JsonError {
  message: string;
  line?: number;
  column?: number;
}

function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

function JsonFormatterInner(): React.JSX.Element {
  const { tool } = useTool();

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<JsonError | null>(null);
  const [indent, setIndent] = useState(2);
  const [sortKeys, setSortKeys] = useState(false);

  const formatJson = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const dataToFormat = sortKeys ? sortObjectKeys(parsed) : parsed;
      const formatted = JSON.stringify(dataToFormat, null, indent);
      setOutput(formatted);
      setError(null);
    } catch (e) {
      const err = e as Error;
      setError({ message: err.message });
      setOutput("");
    }
  }, [input, indent, sortKeys]);

  const minifyJson = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      setOutput(minified);
      setError(null);
    } catch {
      setError({ message: "Invalid JSON" });
      setOutput("");
    }
  }, [input]);

  const copyOutput = useCallback(async () => {
    if (output) await navigator.clipboard.writeText(output);
  }, [output]);

  const clearAll = useCallback(() => {
    setInput("");
    setOutput("");
    setError(null);
  }, []);

  const loadSample = useCallback(() => {
    const sample = {
      name: "JSON Formatter",
      version: "1.0.0",
      features: ["format", "minify", "validate"],
      config: { indent: 2 },
    };
    setInput(JSON.stringify(sample, null, 2));
    setOutput("");
    setError(null);
  }, []);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "JSON Formatter"}
        description="Format and validate JSON data"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="lg" className="max-w-6xl mx-auto">
          {/* Settings */}
          <Surface variant="elevated" padding="md" className="mb-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-400">Indent:</label>
                <select
                  value={indent}
                  onChange={(e) => setIndent(parseInt(e.target.value, 10))}
                  className="px-3 py-2 bg-black border border-white/10 rounded text-white text-sm focus:outline-none focus:border-white/30"
                >
                  <option value="2">2 spaces</option>
                  <option value="4">4 spaces</option>
                  <option value="1">1 tab</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={sortKeys}
                  onChange={(e) => setSortKeys(e.target.checked)}
                  className="rounded border-white/10 bg-black"
                />
                <span>Sort keys</span>
              </label>
              <div className="flex-1" />
              <button onClick={loadSample} className="text-xs text-zinc-500 hover:text-white transition-colors">
                Sample
              </button>
              <button onClick={clearAll} className="text-xs text-zinc-500 hover:text-white transition-colors">
                Clear
              </button>
            </div>
          </Surface>

          {/* Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Input JSON</label>
                <span className="text-xs text-zinc-500">{input.length} characters</span>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='{\n  "key": "value"\n}'
                rows={12}
                className="w-full px-4 py-3 bg-black border border-white/10 rounded-md text-white font-mono text-sm resize-none focus:outline-none focus:border-white/30"
                spellCheck={false}
              />
            </div>

            {/* Output */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Output</label>
                {output && (
                  <span className="text-xs text-zinc-500">{output.length} characters</span>
                )}
              </div>
              <div className="h-[296px] bg-zinc-900/50 border border-white/10 rounded-md p-4 overflow-auto">
                {error ? (
                  <div className="p-4 bg-zinc-900 border border-zinc-700 rounded">
                    <p className="text-zinc-300 text-sm">Invalid JSON</p>
                    <p className="text-xs text-zinc-500 mt-1">{error.message}</p>
                  </div>
                ) : (
                  <pre className="text-sm text-white font-mono whitespace-pre-wrap break-words">
                    {output || <span className="text-zinc-500">Output will appear here...</span>}
                  </pre>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <TactileButton onClick={formatJson} disabled={!input.trim()}>
              Format
            </TactileButton>
            <TactileButton variant="secondary" onClick={minifyJson} disabled={!input.trim()}>
              Minify
            </TactileButton>
            <div className="flex-1" />
            <TactileButton variant="secondary" onClick={copyOutput} disabled={!output}>
              Copy
            </TactileButton>
          </div>
        </Container>
      </div>
    </div>
  );
}

export default function JsonFormatterPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "json-formatter",
    name: "JSON Formatter",
    description: "Format and validate JSON data",
    category: "web",
    accent: "blue",
    layout: "live-playground",
    enabled: true,
    route: "/app/web/json-formatter",
  };

  return (
    <ToolProvider tool={tool}>
      <JsonFormatterInner />
    </ToolProvider>
  );
}
