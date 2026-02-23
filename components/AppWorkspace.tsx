'use client';

import { useState } from 'react';
import {
  Film,
  Music,
  Image,
  Code,
  Globe,
  Lock,
  Terminal,
  Settings,
  ChevronRight,
  Upload,
  Zap,
  FileText,
  Cpu,
  Download,
  ArrowUpRight,
  User,
} from 'lucide-react';

// ============================================
// TOOL CONFIGURATION
// ============================================

const toolCategories = [
  {
    id: 'media',
    label: 'Media',
    tools: [
      { id: 'video-compressor', name: 'Video Compressor', icon: Film, description: 'Compress video files with customizable quality settings' },
      { id: 'audio-converter', name: 'Audio Converter', icon: Music, description: 'Convert audio between formats with bitrate control' },
      { id: 'image-optimizer', name: 'Image Optimizer', icon: Image, description: 'Optimize and resize images for web' },
    ],
  },
  {
    id: 'developer',
    label: 'Developer',
    tools: [
      { id: 'json-formatter', name: 'JSON Formatter', icon: Code, description: 'Format, validate, and minify JSON data' },
      { id: 'hash-generator', name: 'Hash Generator', icon: Lock, description: 'Generate MD5, SHA-256, and other hashes' },
      { id: 'base64-encoder', name: 'Base64 Encoder', icon: Terminal, description: 'Encode and decode Base64 strings' },
      { id: 'dev-playground', name: 'Dev Playground', icon: Cpu, description: 'Test code snippets and experiments' },
    ],
  },
  {
    id: 'web',
    label: 'Web Tools',
    tools: [
      { id: 'url-downloader', name: 'URL Downloader', icon: Globe, description: 'Download media from public URLs' },
      { id: 'metadata-extractor', name: 'Metadata Extractor', icon: FileText, description: 'Extract metadata from files and URLs' },
    ],
  },
];

const allTools = toolCategories.flatMap((cat) => cat.tools);

// ============================================
// PLACEHOLDER TOOL UI COMPONENTS
// ============================================

function VideoCompressorUI() {
  return (
    <div className="p-8 space-y-8">
      <div className="bg-zinc-950 border border-white/10 rounded-sm p-8 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-sm mx-auto flex items-center justify-center mb-4">
          <Upload className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="font-semibold mb-2">Upload Video</h3>
        <p className="text-zinc-500 text-sm mb-4">Drag and drop or click to select</p>
        <p className="text-xs text-zinc-600 font-mono">Max file size: 200MB</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-950 border border-white/10 rounded-sm p-4">
          <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3 block">Quality Preset</label>
          <select className="w-full bg-black border border-white/10 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-white/30">
            <option>High (1080p)</option>
            <option>Medium (720p)</option>
            <option>Low (480p)</option>
            <option>Custom</option>
          </select>
        </div>
        <div className="bg-zinc-950 border border-white/10 rounded-sm p-4">
          <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3 block">Output Format</label>
          <select className="w-full bg-black border border-white/10 rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-white/30">
            <option>MP4 (H.264)</option>
            <option>WebM (VP9)</option>
            <option>MOV</option>
          </select>
        </div>
      </div>

      <button className="w-full bg-white text-black py-3 font-medium rounded-sm hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2">
        <Zap className="w-4 h-4" />
        Compress Video
      </button>
    </div>
  );
}

function AudioConverterUI() {
  return (
    <div className="p-8 space-y-8">
      <div className="bg-zinc-950 border border-white/10 rounded-sm p-8 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-sm mx-auto flex items-center justify-center mb-4">
          <Upload className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="font-semibold mb-2">Upload Audio</h3>
        <p className="text-zinc-500 text-sm">Supports MP3, WAV, FLAC, AAC, OGG</p>
      </div>

      <div className="bg-zinc-950 border border-white/10 rounded-sm p-4">
        <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3 block">Output Format</label>
        <div className="grid grid-cols-4 gap-2">
          {['MP3', 'WAV', 'FLAC', 'AAC'].map((format) => (
            <button
              key={format}
              className="py-2 text-sm border border-white/10 rounded-sm hover:bg-white/5 hover:border-white/20 transition-all"
            >
              {format}
            </button>
          ))}
        </div>
      </div>

      <button className="w-full bg-white text-black py-3 font-medium rounded-sm hover:bg-zinc-200 transition-colors">
        Convert Audio
      </button>
    </div>
  );
}

function JsonFormatterUI() {
  return (
    <div className="p-8 space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <button className="px-3 py-1.5 text-xs font-mono bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 transition-colors">
          Format
        </button>
        <button className="px-3 py-1.5 text-xs font-mono bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 transition-colors">
          Minify
        </button>
        <button className="px-3 py-1.5 text-xs font-mono bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 transition-colors">
          Validate
        </button>
        <button className="px-3 py-1.5 text-xs font-mono bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 transition-colors">
          Copy
        </button>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-[400px]">
        <div className="bg-zinc-950 border border-white/10 rounded-sm overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-white/10 text-xs font-mono text-zinc-500">
            INPUT
          </div>
          <textarea
            className="flex-1 bg-transparent p-4 font-mono text-sm resize-none focus:outline-none"
            placeholder='{"paste": "your json here"}'
            spellCheck={false}
          />
        </div>
        <div className="bg-zinc-950 border border-white/10 rounded-sm overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-white/10 text-xs font-mono text-zinc-500">
            OUTPUT
          </div>
          <div className="flex-1 p-4 font-mono text-sm text-zinc-500">
            <span className="text-zinc-600">{`// Formatted output will appear here`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HashGeneratorUI() {
  return (
    <div className="p-8 space-y-6">
      <div className="bg-zinc-950 border border-white/10 rounded-sm p-4">
        <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3 block">Input Text</label>
        <textarea
          className="w-full bg-black border border-white/10 rounded-sm p-3 font-mono text-sm resize-none h-24 focus:outline-none focus:border-white/30"
          placeholder="Enter text to hash..."
          spellCheck={false}
        />
      </div>

      <div className="space-y-3">
        {['MD5', 'SHA-1', 'SHA-256', 'SHA-512'].map((algo) => (
          <div key={algo} className="bg-zinc-950 border border-white/10 rounded-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-zinc-500">{algo}</span>
              <button className="text-xs text-zinc-500 hover:text-white transition-colors">
                Copy
              </button>
            </div>
            <div className="font-mono text-sm text-zinc-600 truncate">
              {algo === 'SHA-256' ? 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Base64EncoderUI() {
  return (
    <div className="p-8 space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <button className="px-3 py-1.5 text-xs font-mono bg-white text-black rounded-sm">
          Encode
        </button>
        <button className="px-3 py-1.5 text-xs font-mono bg-white/5 border border-white/10 rounded-sm hover:bg-white/10 transition-colors">
          Decode
        </button>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-[300px]">
        <div className="bg-zinc-950 border border-white/10 rounded-sm overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-white/10 text-xs font-mono text-zinc-500">
            PLAINTEXT
          </div>
          <textarea
            className="flex-1 bg-transparent p-4 font-mono text-sm resize-none focus:outline-none"
            placeholder="Enter text..."
            spellCheck={false}
          />
        </div>
        <div className="bg-zinc-950 border border-white/10 rounded-sm overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-white/10 text-xs font-mono text-zinc-500">
            BASE64
          </div>
          <textarea
            className="flex-1 bg-transparent p-4 font-mono text-sm resize-none focus:outline-none text-zinc-500"
            placeholder="Encoded result..."
            readOnly
          />
        </div>
      </div>
    </div>
  );
}

function UrlDownloaderUI() {
  return (
    <div className="p-8 space-y-6">
      <div className="bg-zinc-950 border border-white/10 rounded-sm p-6">
        <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3 block">
          Public URL
        </label>
        <div className="flex gap-3">
          <input
            type="url"
            className="flex-1 bg-black border border-white/10 rounded-sm px-4 py-3 text-sm focus:outline-none focus:border-white/30 font-mono"
            placeholder="https://example.com/media.mp4"
          />
          <button className="bg-white text-black px-6 py-3 font-medium rounded-sm hover:bg-zinc-200 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            Fetch
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-3 flex items-start gap-2">
          <span className="text-amber-500/70">*</span>
          You must have rights to download this content. Only public URLs are supported.
        </p>
      </div>

      <div className="bg-zinc-950 border border-white/10 rounded-sm p-4">
        <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-4">Recent Downloads</div>
        <div className="space-y-2 text-zinc-600 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="font-mono truncate">No downloads yet</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GenericToolUIProps {
  name: string;
  description: string;
}

function GenericToolUI({ name, description }: GenericToolUIProps): React.JSX.Element {
  return (
    <div className="p-8">
      <div className="bg-zinc-950 border border-white/10 rounded-sm p-12 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-sm mx-auto flex items-center justify-center mb-4">
          <Cpu className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="font-semibold mb-2">{name}</h3>
        <p className="text-zinc-500 text-sm">{description}</p>
        <p className="text-xs text-zinc-600 mt-4 font-mono">Coming soon</p>
      </div>
    </div>
  );
}

// Tool renderer map
const toolComponents: Record<string, () => React.JSX.Element> = {
  'video-compressor': VideoCompressorUI,
  'audio-converter': AudioConverterUI,
  'image-optimizer': () => <GenericToolUI name="Image Optimizer" description="Optimize and resize images for web" />,
  'json-formatter': JsonFormatterUI,
  'hash-generator': HashGeneratorUI,
  'base64-encoder': Base64EncoderUI,
  'dev-playground': () => <GenericToolUI name="Dev Playground" description="Test code snippets and experiments" />,
  'url-downloader': UrlDownloaderUI,
  'metadata-extractor': () => <GenericToolUI name="Metadata Extractor" description="Extract metadata from files and URLs" />,
};

// ============================================
// MAIN APP WORKSPACE COMPONENT
// ============================================

export default function AppWorkspace() {
  const [activeTool, setActiveTool] = useState('video-compressor');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const currentTool = allTools.find((t) => t.id === activeTool);
  const ToolComponent = toolComponents[activeTool] || (() => <GenericToolUI name="Unknown Tool" description="" />);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-black text-white font-sans antialiased">
      {/* Left Sidebar */}
      <aside
        className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-black border-r border-white/10 flex flex-col transition-all duration-200`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-white rounded-sm flex items-center justify-center">
                <Terminal className="w-4 h-4 text-black" />
              </div>
              <span className="font-semibold text-sm tracking-tight">Marczelloo</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors"
          >
            <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${sidebarCollapsed ? 'rotate-0' : 'rotate-180'}`} />
          </button>
        </div>

        {/* Tool Categories */}
        <nav className="flex-1 overflow-y-auto py-4">
          {toolCategories.map((category) => (
            <div key={category.id} className="mb-6">
              {!sidebarCollapsed && (
                <div className="px-4 mb-2">
                  <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
                    {category.label}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {category.tools.map((tool) => {
                  const isActive = activeTool === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2 text-sm transition-all
                        ${isActive
                          ? 'bg-white/5 text-white border-l-2 border-white'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                        }
                      `}
                    >
                      <tool.icon className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{tool.name}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-white/10 p-4">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <div className="text-sm font-medium">Guest</div>
                  <div className="text-xs text-zinc-500">Free tier</div>
                </div>
              </div>
              <button className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors">
                <Settings className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          ) : (
            <button className="w-8 h-8 mx-auto flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors">
              <Settings className="w-4 h-4 text-zinc-500" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="flex-1 bg-zinc-950 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span>Tools</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white">{currentTool?.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono text-zinc-400">System Online</span>
            </div>
            <button className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-white/5 transition-colors">
              <ArrowUpRight className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </header>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Tool Header */}
            <div className="px-8 pt-8 pb-4 border-b border-white/10">
              <h1 className="text-2xl font-bold">{currentTool?.name}</h1>
              <p className="text-zinc-500 text-sm mt-1">{currentTool?.description}</p>
            </div>

            {/* Tool Interface */}
            <ToolComponent />
          </div>
        </div>

        {/* Status Bar */}
        <footer className="h-8 border-t border-white/10 flex items-center justify-between px-6 text-xs text-zinc-600 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-mono">{activeTool}</span>
            <span>v1.0.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span>CPU: 12%</span>
            <span>Memory: 256MB</span>
            <span>Queue: 0</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
