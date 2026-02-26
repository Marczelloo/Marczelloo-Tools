"use client";

import { useState, useCallback } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";
import { TactileFormatGrid, type FormatOption } from "@/components/tool-ui/TactileFormatGrid";
import { TactileButton } from "@/components/tool-ui/TactileButton";

function Base64EncoderInner(): React.JSX.Element {
  const { tool } = useTool();

  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const process = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError(null);
      return;
    }

    try {
      if (mode === "encode") {
        const encoded = btoa(unescape(encodeURIComponent(input)));
        setOutput(encoded);
        setError(null);
      } else {
        const decoded = decodeURIComponent(escape(atob(input.trim())));
        setOutput(decoded);
        setError(null);
      }
    } catch {
      setError(mode === "encode" ? "Failed to encode text" : "Invalid Base64 string");
      setOutput("");
    }
  }, [input, mode]);

  const copyOutput = useCallback(async () => {
    if (output) {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [output]);

  const swapInputOutput = useCallback(() => {
    if (output) {
      setInput(output);
      setOutput(input);
      setMode(mode === "encode" ? "decode" : "encode");
      setError(null);
    }
  }, [input, output, mode]);

  const clearAll = useCallback(() => {
    setInput("");
    setOutput("");
    setError(null);
  }, []);

  const loadSample = useCallback(() => {
    setInput("Hello, World! This is a test string for Base64 encoding.");
    setOutput("");
    setError(null);
  }, []);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Base64 Encoder"}
        description="Encode and decode Base64 strings"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="lg" className="max-w-4xl mx-auto">
          <Surface variant="elevated" padding="lg">
            {/* Mode Toggle */}
            <div className="mb-6">
              <label className="block text-sm text-zinc-400 mb-2">Mode</label>
              <TactileFormatGrid
                options={[
                  { value: "encode", label: "Encode", desc: "Text to Base64" },
                  { value: "decode", label: "Decode", desc: "Base64 to Text" },
                ] as const}
                value={mode}
                onChange={(v) => setMode(v as "encode" | "decode")}
                columns={2}
              />
            </div>

            {/* Split Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-zinc-400">
                    {mode === "encode" ? "Plain Text" : "Base64 String"}
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={loadSample}
                      className="text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                      Sample
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-xs text-zinc-500 hover:text-white transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={mode === "encode" ? "Enter text to encode..." : "Enter Base64 to decode..."}
                  rows={10}
                  className="w-full px-4 py-3 bg-black border border-white/10 rounded-md text-white font-mono text-sm resize-none focus:outline-none focus:border-white/30"
                  spellCheck={false}
                />
              </div>

              {/* Output */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-zinc-400">
                    {mode === "encode" ? "Base64 Output" : "Decoded Text"}
                  </label>
                  {output && (
                    <span className="text-xs text-zinc-500">{output.length} characters</span>
                  )}
                </div>
                <div className="min-h-[260px] bg-zinc-900/50 border border-white/10 rounded-md p-4">
                  {error ? (
                    <div className="p-3 bg-zinc-900 border border-zinc-700 rounded">
                      <p className="text-zinc-300 text-sm">{error}</p>
                    </div>
                  ) : (
                    <pre className="text-sm text-white font-mono whitespace-pre-wrap break-words">
                      {output || <span className="text-zinc-500">Output will appear here...</span>}
                    </pre>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <TactileButton onClick={process} disabled={!input.trim()} fullWidth>
                    {mode === "encode" ? "Encode" : "Decode"}
                  </TactileButton>
                  <TactileButton variant="secondary" onClick={swapInputOutput} disabled={!output}>
                    Swap
                  </TactileButton>
                  <TactileButton variant="secondary" onClick={copyOutput} disabled={!output}>
                    {copied ? "Copied!" : "Copy"}
                  </TactileButton>
                </div>
              </div>
            </div>
          </Surface>
        </Container>
      </div>
    </div>
  );
}

export default function Base64EncoderPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "base64-encoder",
    name: "Base64 Encoder",
    description: "Encode and decode Base64 strings",
    category: "web",
    accent: "blue",
    layout: "form-heavy",
    enabled: true,
    route: "/app/web/base64-encoder",
  };

  return (
    <ToolProvider tool={tool}>
      <Base64EncoderInner />
    </ToolProvider>
  );
}
