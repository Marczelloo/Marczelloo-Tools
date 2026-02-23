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
        accent="orange"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-0">
        {/* Left Panel - Input */}
        <div className="flex flex-col border-r border-border">
          {/* Toolbar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b border-border bg-background-secondary">
            <button
              onClick={loadSample}
              className="px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary transition-colors-fast"
            >
              Sample
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-sm text-content-secondary hover:text-content-primary transition-colors-fast"
            >
              Clear
            </button>
          </div>

          {/* Input Label */}
          <div className="flex-shrink-0 px-4 py-2 border-b border-border-subtle">
            <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
              JWT Token
            </span>
          </div>

          {/* Input Textarea */}
          <div className="flex-1 min-h-0">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your JWT token here..."
              className="w-full h-full p-4 bg-transparent text-content-primary font-mono text-sm resize-none focus:outline-none"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="flex flex-col">
          {/* Error Display */}
          {error ? (
            <div className="p-4">
              <div className="p-4 bg-accent-red-muted border border-accent-red rounded">
                <p className="text-accent-red font-medium">Invalid JWT</p>
                <p className="text-sm text-content-secondary mt-1">{error}</p>
              </div>
            </div>
          ) : decoded ? (
            <div className="flex-1 overflow-auto">
              {/* Header Section */}
              <div className="border-b border-border">
                <div className="px-4 py-2 bg-background-secondary flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-accent-red text-background-primary rounded">
                      HEADER
                    </span>
                    <span className="text-xs text-content-muted">Algorithm & Token Type</span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(JSON.stringify(decoded.header, null, 2), "header")
                    }
                    className={`px-2 py-1 text-xs transition-colors-fast ${
                      copied === "header" ? "text-accent-green" : "text-content-secondary hover:text-content-primary"
                    }`}
                  >
                    {copied === "header" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-content-primary font-mono text-sm overflow-x-auto">
                  {JSON.stringify(decoded.header, null, 2)}
                </pre>
              </div>

              {/* Payload Section */}
              <div className="border-b border-border">
                <div className="px-4 py-2 bg-background-secondary flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-accent-purple text-background-primary rounded">
                      PAYLOAD
                    </span>
                    <span className="text-xs text-content-muted">Data</span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(JSON.stringify(decoded.payload, null, 2), "payload")
                    }
                    className={`px-2 py-1 text-xs transition-colors-fast ${
                      copied === "payload" ? "text-accent-green" : "text-content-secondary hover:text-content-primary"
                    }`}
                  >
                    {copied === "payload" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-content-primary font-mono text-sm overflow-x-auto">
                  {JSON.stringify(decoded.payload, null, 2)}
                </pre>
              </div>

              {/* Timestamp Claims */}
              {(decoded.payload.iat || decoded.payload.exp || decoded.payload.nbf) && (
                <div className="border-b border-border">
                  <div className="px-4 py-2 bg-background-secondary">
                    <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                      Timestamp Claims
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    {decoded.payload.iat && (
                      <div className="flex justify-between text-sm">
                        <span className="text-content-muted">Issued At (iat):</span>
                        <span className="text-content-primary">
                          {formatTimestamp(decoded.payload.iat)}
                        </span>
                      </div>
                    )}
                    {decoded.payload.nbf && (
                      <div className="flex justify-between text-sm">
                        <span className="text-content-muted">Not Before (nbf):</span>
                        <span className="text-content-primary">
                          {formatTimestamp(decoded.payload.nbf)}
                        </span>
                      </div>
                    )}
                    {decoded.payload.exp && (
                      <div className="flex justify-between text-sm">
                        <span className="text-content-muted">Expires (exp):</span>
                        <span
                          className={
                            new Date(decoded.payload.exp * 1000) < new Date()
                              ? "text-accent-red"
                              : "text-accent-green"
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
                <div className="px-4 py-2 bg-background-secondary flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-accent-blue text-background-primary rounded">
                      SIGNATURE
                    </span>
                    <span className="text-xs text-content-muted">Verify Signature</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(decoded.signature, "signature")}
                    className={`px-2 py-1 text-xs transition-colors-fast ${
                      copied === "signature" ? "text-accent-green" : "text-content-secondary hover:text-content-primary"
                    }`}
                  >
                    {copied === "signature" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 text-content-primary font-mono text-sm break-all">
                  {decoded.signature}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-content-muted">Paste a JWT token to decode it</p>
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
    accent: "orange",
    layout: "split-panel",
    enabled: true,
    route: "/dev/jwt-decoder",
  };

  return (
    <ToolProvider tool={tool}>
      <JwtDecoderInner />
    </ToolProvider>
  );
}
