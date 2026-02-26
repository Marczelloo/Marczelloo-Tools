"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

interface JwtHeader {
  typ?: string;
  alg?: string;
  kid?: string;
  [key: string]: unknown;
}

interface JwtPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  [key: string]: unknown;
}

interface DecodedJwt {
  header: JwtHeader;
  payload: JwtPayload;
  signature: string;
  headerRaw: string;
  payloadRaw: string;
}

// ============================================================================
// JWT DECODER COMPONENT
// ============================================================================

function JwtDecoderInner(): React.JSX.Element {
  const { tool } = useTool();
  const [input, setInput] = useState("");
  const [decoded, setDecoded] = useState<DecodedJwt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const decodeJwt = useCallback((token: string) => {
    if (!token.trim()) {
      setDecoded(null);
      setError(null);
      return;
    }

    try {
      const parts = token.trim().split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format. Expected 3 parts separated by dots.");
      }

      const decodeBase64Url = (str: string): string => {
        // Convert Base64URL to Base64
        let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
        // Pad with = if needed
        while (base64.length % 4 !== 0) {
          base64 += "=";
        }
        return decodeURIComponent(escape(atob(base64)));
      };

      const headerRaw = parts[0] ?? "";
      const payloadRaw = parts[1] ?? "";
      const signature = parts[2] ?? "";

      const header = JSON.parse(decodeBase64Url(headerRaw)) as JwtHeader;
      const payload = JSON.parse(decodeBase64Url(payloadRaw)) as JwtPayload;

      setDecoded({
        header,
        payload,
        signature,
        headerRaw,
        payloadRaw,
      });
      setError(null);
    } catch (e) {
      const err = e as Error;
      setError(err.message);
      setDecoded(null);
    }
  }, []);

  // Auto-decode on input change
  useEffect(() => {
    const timer = setTimeout(() => decodeJwt(input), 200);
    return () => clearTimeout(timer);
  }, [input, decodeJwt]);

  const copyToClipboard = useCallback(async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const formatTimestamp = (timestamp: number | undefined): string => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isExpired = date < now;
    return `${date.toLocaleString()} ${isExpired ? "(Expired)" : "(Valid)"}`;
  };

  const loadSample = useCallback(() => {
    // Sample JWT for demonstration
    setInput(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3MDk4NTYwMDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    );
  }, []);

  const clearAll = useCallback(() => {
    setInput("");
    setDecoded(null);
    setError(null);
  }, []);

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col">
      <PageHeader
        title={tool?.name ?? "JWT Decoder"}
        description="Decode and inspect JWT tokens"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* Left Panel - Input */}
        <div className="flex flex-col border-r border-white/10">
          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-zinc-950">
            <button
              onClick={loadSample}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sample
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Input Label */}
          <div className="flex-shrink-0 px-4 py-2 border-b border-white/5">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
              JWT Token
            </span>
          </div>

          {/* Input Textarea */}
          <div className="flex-1 min-h-0">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your JWT token here..."
              className="w-full h-full p-4 bg-transparent text-white font-mono text-sm resize-none focus:outline-none"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="flex flex-col">
          {/* Error Display */}
          {error ? (
            <div className="p-4">
              <div className="p-4 bg-zinc-900 border border-zinc-700 rounded">
                <p className="text-zinc-300 font-medium">Invalid JWT</p>
                <p className="text-sm text-zinc-400 mt-1">{error}</p>
              </div>
            </div>
          ) : decoded ? (
            <div className="flex-1 overflow-auto">
              {/* Header Section */}
              <div className="border-b border-white/10">
                <div className="px-4 py-2 bg-zinc-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-zinc-700 text-white rounded">
                      HEADER
                    </span>
                    <span className="text-xs text-zinc-500">Algorithm & Token Type</span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(JSON.stringify(decoded.header, null, 2), "header")
                    }
                    className={`px-2 py-1 text-xs transition-colors ${
                      copied === "header" ? "text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {copied === "header" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-white font-mono text-sm overflow-x-auto">
                  {JSON.stringify(decoded.header, null, 2)}
                </pre>
              </div>

              {/* Payload Section */}
              <div className="border-b border-white/10">
                <div className="px-4 py-2 bg-zinc-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-zinc-600 text-white rounded">
                      PAYLOAD
                    </span>
                    <span className="text-xs text-zinc-500">Data</span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(JSON.stringify(decoded.payload, null, 2), "payload")
                    }
                    className={`px-2 py-1 text-xs transition-colors ${
                      copied === "payload" ? "text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {copied === "payload" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-white font-mono text-sm overflow-x-auto">
                  {JSON.stringify(decoded.payload, null, 2)}
                </pre>
              </div>

              {/* Timestamp Claims */}
              {(decoded.payload.iat || decoded.payload.exp || decoded.payload.nbf) && (
                <div className="border-b border-white/10">
                  <div className="px-4 py-2 bg-zinc-950">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Timestamp Claims
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    {decoded.payload.iat && (
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Issued At (iat):</span>
                        <span className="text-white">
                          {formatTimestamp(decoded.payload.iat)}
                        </span>
                      </div>
                    )}
                    {decoded.payload.nbf && (
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Not Before (nbf):</span>
                        <span className="text-white">
                          {formatTimestamp(decoded.payload.nbf)}
                        </span>
                      </div>
                    )}
                    {decoded.payload.exp && (
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Expires (exp):</span>
                        <span
                          className={
                            new Date(decoded.payload.exp * 1000) < new Date()
                              ? "text-zinc-300"
                              : "text-zinc-200"
                          }
                        >
                          {formatTimestamp(decoded.payload.exp)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Signature Section */}
              <div>
                <div className="px-4 py-2 bg-zinc-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-zinc-800 text-white rounded">
                      SIGNATURE
                    </span>
                    <span className="text-xs text-zinc-500">Verify Signature</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(decoded.signature, "signature")}
                    className={`px-2 py-1 text-xs transition-colors ${
                      copied === "signature" ? "text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {copied === "signature" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-white font-mono text-sm break-all">
                  {decoded.signature}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-zinc-500">Paste a JWT token to decode it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function JwtDecoderPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "jwt-decoder",
    name: "JWT Decoder",
    description: "Decode and verify JWT tokens",
    category: "dev",
    accent: "blue",
    layout: "split-panel",
    enabled: true,
    route: "/app/dev/jwt-decoder",
  };

  return (
    <ToolProvider tool={tool}>
      <JwtDecoderInner />
    </ToolProvider>
  );
}
