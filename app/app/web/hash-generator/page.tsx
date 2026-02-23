"use client";

import { useState, useCallback, useEffect } from "react";
import { PageHeader, Surface, Container } from "@/components/layout";
import { ToolProvider, useTool } from "@/lib/tool-context";
import type { ToolDefinition } from "@/lib/featureFlags";

// ============================================================================
// TYPES
// ============================================================================

type HashAlgorithm = "md5" | "sha-1" | "sha-256" | "sha-512";

interface HashResult {
  algorithm: HashAlgorithm;
  hash: string;
}

// ============================================================================
// HASH FUNCTIONS (Web Crypto API)
// ============================================================================

async function hashText(text: string, algorithm: HashAlgorithm): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  let algorithmName: string;
  switch (algorithm) {
    case "md5":
      // MD5 is not supported by Web Crypto API, use a simple implementation
      return md5(text);
    case "sha-1":
      algorithmName = "SHA-1";
      break;
    case "sha-256":
      algorithmName = "SHA-256";
      break;
    case "sha-512":
      algorithmName = "SHA-512";
      break;
  }

  const hashBuffer = await crypto.subtle.digest(algorithmName, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Simple MD5 implementation for browser
function md5(string: string): string {
  function rotateLeft(x: number, n: number) {
    return (x << n) | (x >>> (32 - n));
  }

  function addUnsigned(x: number, y: number) {
    const x4 = x & 0x80000000;
    const y4 = y & 0x80000000;
    const x8 = x & 0x40000000;
    const y8 = y & 0x40000000;
    const result = (x & 0x3fffffff) + (y & 0x3fffffff);
    if (x8 & y8) return result ^ 0x80000000 ^ x4 ^ y4;
    if (x8 | y8) {
      if (result & 0x40000000) return result ^ 0xc0000000 ^ x4 ^ y4;
      return result ^ 0x40000000 ^ x4 ^ y4;
    }
    return result ^ x4 ^ y4;
  }

  function F(x: number, y: number, z: number) {
    return (x & y) | (~x & z);
  }
  function G(x: number, y: number, z: number) {
    return (x & z) | (y & ~z);
  }
  function H(x: number, y: number, z: number) {
    return x ^ y ^ z;
  }
  function I(x: number, y: number, z: number) {
    return y ^ (x | ~z);
  }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(str: string) {
    const utf8 = unescape(encodeURIComponent(str));
    const len = utf8.length;
    const words: number[] = [];

    for (let i = 0; i < len; i += 4) {
      words.push(
        (utf8.charCodeAt(i) || 0) |
          ((utf8.charCodeAt(i + 1) || 0) << 8) |
          ((utf8.charCodeAt(i + 2) || 0) << 16) |
          ((utf8.charCodeAt(i + 3) || 0) << 24)
      );
    }

    const bitLen = len * 8;
    const wordIndex = len >> 2;
    words[wordIndex] = (words[wordIndex] ?? 0) | 0x80 << ((len % 4) * 8);
    const paddingIndex = (((len + 8) >>> 6) << 4) + 14;
    words[paddingIndex] = bitLen;

    return words;
  }

  function wordToHex(value: number) {
    let hex = "";
    for (let i = 0; i <= 3; i++) {
      const byte = (value >>> (i * 8)) & 255;
      hex += `0${byte.toString(16)}`.slice(-2);
    }
    return hex;
  }

  const x = convertToWordArray(string);
  let a = 0x67452301,
    b = 0xefcdab89,
    c = 0x98badcfe,
    d = 0x10325476;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a,
      BB = b,
      CC = c,
      DD = d;

    a = FF(a, b, c, d, x[k + 0]!, 7, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1]!, 12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2]!, 17, 0x242070db);
    b = FF(b, c, d, a, x[k + 3]!, 22, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4]!, 7, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5]!, 12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6]!, 17, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7]!, 22, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8]!, 7, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9]!, 12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10]!, 17, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11]!, 22, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12]!, 7, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13]!, 12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14]!, 17, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15]!, 22, 0x49b40821);

    a = GG(a, b, c, d, x[k + 1]!, 5, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6]!, 9, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11]!, 14, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0]!, 20, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5]!, 5, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10]!, 9, 0x02441453);
    c = GG(c, d, a, b, x[k + 15]!, 14, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4]!, 20, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9]!, 5, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14]!, 9, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3]!, 14, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8]!, 20, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13]!, 5, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2]!, 9, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7]!, 14, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12]!, 20, 0x8d2a4c8a);

    a = HH(a, b, c, d, x[k + 5]!, 4, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8]!, 11, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11]!, 16, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14]!, 23, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1]!, 4, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4]!, 11, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7]!, 16, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10]!, 23, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13]!, 4, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0]!, 11, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3]!, 16, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6]!, 23, 0x04881d05);
    a = HH(a, b, c, d, x[k + 9]!, 4, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12]!, 11, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15]!, 16, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2]!, 23, 0xc4ac5665);

    a = II(a, b, c, d, x[k + 0]!, 6, 0xf4292244);
    d = II(d, a, b, c, x[k + 7]!, 10, 0x432aff97);
    c = II(c, d, a, b, x[k + 14]!, 15, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5]!, 21, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12]!, 6, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3]!, 10, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10]!, 15, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1]!, 21, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8]!, 6, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15]!, 10, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6]!, 15, 0xa3014314);
    b = II(b, c, d, a, x[k + 13]!, 21, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4]!, 6, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11]!, 10, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2]!, 15, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9]!, 21, 0xeb86d391);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// ============================================================================
// HASH GENERATOR COMPONENT
// ============================================================================

function HashGeneratorInner(): React.JSX.Element {
  const { tool } = useTool();
  const [input, setInput] = useState("");
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<HashAlgorithm[]>(["md5", "sha-256"]);
  const [results, setResults] = useState<HashResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const algorithms: { id: HashAlgorithm; name: string; description: string }[] = [
    { id: "md5", name: "MD5", description: "128-bit, not for security" },
    { id: "sha-1", name: "SHA-1", description: "160-bit, deprecated" },
    { id: "sha-256", name: "SHA-256", description: "256-bit, recommended" },
    { id: "sha-512", name: "SHA-512", description: "512-bit, secure" },
  ];

  const toggleAlgorithm = useCallback((algo: HashAlgorithm) => {
    setSelectedAlgorithms((prev) =>
      prev.includes(algo) ? prev.filter((a) => a !== algo) : [...prev, algo]
    );
  }, []);

  const generateHashes = useCallback(async () => {
    if (!input.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const newResults: HashResult[] = [];
      for (const algo of selectedAlgorithms) {
        const hash = await hashText(input, algo);
        newResults.push({ algorithm: algo, hash });
      }
      setResults(newResults);
    } finally {
      setLoading(false);
    }
  }, [input, selectedAlgorithms]);

  // Auto-generate on input change
  useEffect(() => {
    const timer = setTimeout(generateHashes, 300);
    return () => clearTimeout(timer);
  }, [generateHashes]);

  const copyToClipboard = useCallback(async (hash: string, algo: HashAlgorithm) => {
    await navigator.clipboard.writeText(hash);
    setCopied(algo);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  return (
    <div className="min-h-full">
      <PageHeader
        title={tool?.name ?? "Hash Generator"}
        description="Generate MD5, SHA-1, SHA-256, SHA-512 hashes"
        accent="green"
        backButton={{ href: "/app" as const, label: "Back to Dashboard" }}
      />

      <div className="p-6">
        <Container size="md" className="max-w-2xl mx-auto">
          <Surface variant="elevated" padding="lg">
            {/* Input */}
            <div className="mb-6">
              <label className="block text-sm text-content-secondary mb-2">
                Text to Hash
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter text to generate hash..."
                rows={4}
                className="w-full px-4 py-3 bg-surface border border-border rounded-md text-content-primary font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent-green"
              />
              <p className="mt-2 text-xs text-content-muted">
                {input.length} characters
              </p>
            </div>

            {/* Algorithm Selection */}
            <div className="mb-6">
              <label className="block text-sm text-content-secondary mb-2">
                Algorithms
              </label>
              <div className="grid grid-cols-2 gap-2">
                {algorithms.map((algo) => (
                  <button
                    key={algo.id}
                    onClick={() => toggleAlgorithm(algo.id)}
                    className={`px-4 py-3 rounded-md text-left transition-colors-fast ${
                      selectedAlgorithms.includes(algo.id)
                        ? "bg-accent-green text-background-primary"
                        : "bg-surface border border-border text-content-secondary hover:bg-interactive-hover"
                    }`}
                  >
                    <span className="font-medium">{algo.name}</span>
                    <span className="block text-xs opacity-75">{algo.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-content-muted uppercase tracking-wider mb-3">
                  Generated Hashes
                </h3>

                <div className="space-y-3">
                  {results.map((result) => (
                    <div
                      key={result.algorithm}
                      className="flex items-start justify-between gap-4 p-3 bg-surface-muted rounded-md group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-content-muted uppercase mb-1">
                          {result.algorithm.toUpperCase()}
                        </p>
                        <p className="font-mono text-sm text-content-primary break-all">
                          {result.hash}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(result.hash, result.algorithm)}
                        className={`px-3 py-1 text-xs rounded flex-shrink-0 transition-colors-fast ${
                          copied === result.algorithm
                            ? "bg-accent-green text-background-primary"
                            : "bg-surface border border-border text-content-secondary opacity-0 group-hover:opacity-100 hover:bg-interactive-hover"
                        }`}
                      >
                        {copied === result.algorithm ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-4">
                <p className="text-sm text-content-muted">Generating hashes...</p>
              </div>
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

export default function HashGeneratorPage(): React.JSX.Element {
  const tool: ToolDefinition = {
    id: "hash-generator",
    name: "Hash Generator",
    description: "Generate MD5, SHA-1, SHA-256 hashes",
    category: "web",
    accent: "green",
    layout: "form-heavy",
    enabled: true,
    route: "/web/hash-generator",
  };

  return (
    <ToolProvider tool={tool}>
      <HashGeneratorInner />
    </ToolProvider>
  );
}
