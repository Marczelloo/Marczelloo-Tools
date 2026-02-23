'use client';

import Link from 'next/link';
import {
  Zap,
  Shield,
  Cpu,
  Film,
  Code,
  Globe,
  ArrowRight,
  Terminal,
  Sparkles,
  Lock,
} from 'lucide-react';

const features = [
  {
    icon: Film,
    title: 'Media Processing',
    description: 'Compress, convert, and optimize video & audio files directly in your browser with FFmpeg power.',
    span: 'col-span-2',
  },
  {
    icon: Code,
    title: 'Developer Tools',
    description: 'JSON formatting, base64 encoding, hash generation, and more developer utilities.',
    span: 'col-span-1',
  },
  {
    icon: Globe,
    title: 'Web Utilities',
    description: 'Download public media, extract metadata, and process URLs safely.',
    span: 'col-span-1',
  },
  {
    icon: Cpu,
    title: 'Hardware Optimized',
    description: 'Designed to run efficiently on low-power hardware including Raspberry Pi.',
    span: 'col-span-1',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'All processing happens server-side. Files auto-delete. No tracking, no storage.',
    span: 'col-span-2',
  },
];

const stats = [
  { value: '100%', label: 'Client-side optional' },
  { value: '<5s', label: 'Avg processing time' },
  { value: '200MB', label: 'Max file size' },
  { value: '0', label: 'Data stored' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased">
      {/* Subtle Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Hero Section */}
      <header className="relative">
        <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
              <Terminal className="w-5 h-5 text-black" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Marczelloo Tools</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="text-zinc-400 hover:text-white transition-colors text-sm"
            >
              Features
            </a>
            <a
              href="#tools"
              className="text-zinc-400 hover:text-white transition-colors text-sm"
            >
              Tools
            </a>
            <Link
              href="/app"
              className="bg-white text-black px-4 py-2 text-sm font-medium rounded-sm hover:bg-zinc-200 transition-colors"
            >
              Open App
            </Link>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-8 pt-24 pb-32">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                Production-Grade Utility Platform
              </span>
            </div>

            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none mb-8">
              Tools that just
              <br />
              <span className="text-zinc-400">work.</span>
            </h1>

            <p className="text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
              A modular, secure, and minimal utility suite for creators and developers.
              No bloat. No sign-up. No nonsense.
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="/app"
                className="group bg-white text-black px-6 py-3 font-medium rounded-sm hover:bg-zinc-200 transition-colors flex items-center gap-2"
              >
                Launch Workspace
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <button className="px-6 py-3 font-medium text-zinc-400 hover:text-white transition-colors border border-white/10 rounded-sm hover:bg-white/5">
                View on GitHub
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-20 pt-10 border-t border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl font-bold font-mono">{stat.value}</div>
                  <div className="text-sm text-zinc-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Features Section - Bento Grid */}
      <section id="features" className="relative py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Built for Creators & Developers
            </span>
            <h2 className="text-4xl font-bold mt-4">
              Everything you need.
              <br />
              <span className="text-zinc-500">Nothing you don&apos;t.</span>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`${feature.span} bg-zinc-950 border border-white/10 rounded-sm p-6 hover:bg-white/[0.02] hover:border-white/20 transition-all group`}
              >
                <div className="w-10 h-10 bg-white/5 rounded-sm flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                  <feature.icon className="w-5 h-5 text-zinc-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Preview Section */}
      <section id="tools" className="relative py-24 px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Available Tools
            </span>
            <h2 className="text-4xl font-bold mt-4">
              Powerful utilities.
              <br />
              <span className="text-zinc-500">One workspace.</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Video Compressor', icon: Film },
              { name: 'Audio Converter', icon: Zap },
              { name: 'JSON Formatter', icon: Code },
              { name: 'URL Downloader', icon: Globe },
              { name: 'Image Optimizer', icon: Sparkles },
              { name: 'Hash Generator', icon: Lock },
              { name: 'Base64 Encoder', icon: Terminal },
              { name: 'Metadata Extractor', icon: Cpu },
            ].map((tool) => (
              <Link
                href="/app"
                key={tool.name}
                className="flex items-center gap-3 p-4 bg-zinc-950 border border-white/10 rounded-sm hover:bg-white/5 hover:border-white/20 transition-all text-left group"
              >
                <tool.icon className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
                <span className="text-sm font-medium text-zinc-400 group-hover:text-white transition-colors">
                  {tool.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to get started?
          </h2>
          <p className="text-zinc-400 text-lg mb-10">
            No registration required. Just open and use.
          </p>
          <Link
            href="/app"
            className="group bg-white text-black px-8 py-4 font-medium rounded-sm hover:bg-zinc-200 transition-colors inline-flex items-center gap-2"
          >
            Open Workspace
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-sm text-zinc-500">Marczelloo Tools</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
