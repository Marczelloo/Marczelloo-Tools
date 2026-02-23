import { Metadata } from "next";
import { Surface } from "@/components/layout";
import Link from "next/link";
import { Shield, Eye, Database, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - Marczelloo Tools",
  description: "Learn how Marczelloo Tools protects your privacy and handles your data.",
};

export default function PrivacyPolicyPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-zinc-400 text-lg">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Overview */}
        <section className="mb-12">
          <Surface variant="elevated" padding="lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-sm flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Your Privacy Matters</h2>
                <p className="text-zinc-400 leading-relaxed">
                  Marczelloo Tools is built with privacy as a core principle. We don't track you,
                  don't store your files, and don't sell your data. This policy explains exactly
                  what data we collect and why.
                </p>
              </div>
            </div>
          </Surface>
        </section>

        {/* What We Don't Do */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Eye className="w-6 h-6" />
            What We Don't Do
          </h2>
          <div className="grid gap-4">
            {[
              "No cookies for tracking purposes",
              "No third-party analytics or tracking scripts",
              "No selling or sharing your data with anyone",
              "No account required (use tools anonymously)",
              "No storing your uploaded files after processing",
              "No personal information collection",
              "No cross-site tracking or fingerprinting",
            ].map((item) => (
              <Surface key={item} variant="elevated" padding="md">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-white rounded-full flex-shrink-0" />
                  <span className="text-zinc-300">{item}</span>
                </div>
              </Surface>
            ))}
          </div>
        </section>

        {/* What We Collect */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Database className="w-6 h-6" />
            What We Collect
          </h2>

          <div className="space-y-6">
            <Surface variant="elevated" padding="lg">
              <h3 className="font-semibold text-white mb-3">Anonymous Session Data</h3>
              <p className="text-zinc-400 mb-4">
                We use temporary session storage to generate a unique session ID. This helps us
                understand tool usage patterns without identifying you personally.
              </p>
              <div className="bg-zinc-900 border border-white/10 rounded-sm p-4">
                <p className="text-sm text-zinc-500 mb-2">Collected:</p>
                <ul className="text-sm text-zinc-400 space-y-1">
                  <li>• Anonymous session ID (random string, stored in sessionStorage)</li>
                  <li>• Tool name used (e.g., "image-converter")</li>
                  <li>• Processing time (for performance monitoring)</li>
                  <li>• Error events (sanitized, no personal data)</li>
                </ul>
              </div>
            </Surface>

            <Surface variant="elevated" padding="lg">
              <h3 className="font-semibold text-white mb-3">Temporary File Storage</h3>
              <p className="text-zinc-400 mb-4">
                When you upload a file for processing, it's temporarily stored on our servers.
                Files are automatically deleted after you download the result.
              </p>
              <div className="bg-zinc-900 border border-white/10 rounded-sm p-4">
                <p className="text-sm text-zinc-500 mb-2">File Handling:</p>
                <ul className="text-sm text-zinc-400 space-y-1">
                  <li>• Files are renamed with random UUIDs (original names never stored)</li>
                  <li>• Stored in temporary directory only</li>
                  <li>• Deleted immediately after download or within 20 minutes</li>
                  <li>• Never used for any purpose other than your request</li>
                </ul>
              </div>
            </Surface>
          </div>
        </section>

        {/* Session Storage */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Session Storage</h2>
          <Surface variant="elevated" padding="lg">
            <p className="text-zinc-400 mb-4">
              We use browser <strong>session storage</strong> (not cookies) to maintain your
              session during a single visit. This data is automatically cleared when you close
              your browser tab.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-white/10 rounded-sm p-4">
                <p className="text-sm font-medium text-white mb-2">What we store:</p>
                <p className="text-xs text-zinc-500">
                  Anonymous session ID, tool preferences, UI state (expanded categories, etc.)
                </p>
              </div>
              <div className="bg-zinc-900 border border-white/10 rounded-sm p-4">
                <p className="text-sm font-medium text-white mb-2">When it's deleted:</p>
                <p className="text-xs text-zinc-500">
                  Automatically when you close the browser tab or window
                </p>
              </div>
            </div>
          </Surface>
        </section>

        {/* Your Rights */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Trash2 className="w-6 h-6" />
            Your Rights & Control
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Surface variant="elevated" padding="md">
              <h3 className="font-semibold text-white mb-2">No Account Needed</h3>
              <p className="text-sm text-zinc-400">
                Use all tools without creating an account. We don't need your email, name, or any
                personal information.
              </p>
            </Surface>
            <Surface variant="elevated" padding="md">
              <h3 className="font-semibold text-white mb-2">Data Deletion</h3>
              <p className="text-sm text-zinc-400">
                All uploaded files are automatically deleted after processing. Nothing is retained.
              </p>
            </Surface>
            <Surface variant="elevated" padding="md">
              <h3 className="font-semibold text-white mb-2">Opt Out</h3>
              <p className="text-sm text-zinc-400">
                You can disable telemetry by clearing your browser data or using private/incognito
                browsing mode.
              </p>
            </Surface>
            <Surface variant="elevated" padding="md">
              <h3 className="font-semibold text-white mb-2">No Tracking</h3>
              <p className="text-sm text-zinc-400">
                We don't use tracking cookies, fingerprinting, or any cross-site tracking
                technologies.
              </p>
            </Surface>
          </div>
        </section>

        {/* Security */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Security</h2>
          <Surface variant="elevated" padding="lg">
            <p className="text-zinc-400 mb-4">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="space-y-2 text-zinc-400">
              <li className="flex items-start gap-3">
                <span className="text-white mt-1">•</span>
                <span>All file uploads are validated for MIME type and extension</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-white mt-1">•</span>
                <span>Files are renamed with random UUIDs to prevent conflicts</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-white mt-1">•</span>
                <span>Processing happens in isolated sandbox directories</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-white mt-1">•</span>
                <span>Automatic cleanup of temporary files</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-white mt-1">•</span>
                <span>HTTPS encryption for all data transfers</span>
              </li>
            </ul>
          </Surface>
        </section>

        {/* Children */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Children's Privacy</h2>
          <Surface variant="elevated" padding="lg">
            <p className="text-zinc-400">
              Our services are not directed to children under 13. We don't knowingly collect
              personal information from children. If you're a parent and believe your child
              has provided us with personal information, please contact us.
            </p>
          </Surface>
        </section>

        {/* Contact */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Contact & Questions</h2>
          <Surface variant="elevated" padding="lg">
            <p className="text-zinc-400 mb-4">
              If you have questions about this privacy policy or our data practices, please
              contact us through our website.
            </p>
            <a
              href="mailto:privacy@marczelloo.dev"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-sm hover:bg-zinc-200 transition-colors"
            >
              Contact Privacy Team
            </a>
          </Surface>
        </section>

        {/* Footer */}
        <div className="pt-8 border-t border-white/10">
          <p className="text-sm text-zinc-500">
            This privacy policy may be updated from time to time. Significant changes will be
            highlighted on this page.
          </p>
        </div>
      </div>
    </div>
  );
}
