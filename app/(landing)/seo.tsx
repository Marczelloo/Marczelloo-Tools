import { Container } from "@/components/layout";
import Link from "next/link";

export function LandingSEO(): React.JSX.Element {
  return (
    <section className="py-24">
      <Container size="md">
        {/* Main SEO content */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-content-primary mb-6">
            Online Tools for Modern Workflows
          </h2>

          <div className="space-y-4 text-content-secondary text-sm leading-relaxed">
            <p>
              <strong className="text-content-primary">Marczelloo Tools</strong> is
              a collection of free online utilities designed for developers, content
              creators, and anyone who needs quick, reliable file processing. Our
              tools run entirely in the browser or server-side with automatic cleanup.
            </p>

            <p>
              Whether you need to convert video files, compress images, format JSON
              data, or extract audio from videos, our tools provide a clean, ad-free
              experience focused on privacy and efficiency. All uploaded files are
              automatically deleted after 20 minutes.
            </p>

            <p>
              Built with modern web technologies, our platform offers fast
              processing, responsive design, and a distraction-free dark interface
              optimized for focus and productivity.
            </p>
          </div>

          {/* Keywords section (for SEO) */}
          <div className="mt-12 flex flex-wrap justify-center gap-2 text-xs text-content-muted">
            {[
              "video converter",
              "audio extractor",
              "image compressor",
              "json formatter",
              "online tools",
              "file converter",
              "privacy focused",
              "no ads",
            ].map((keyword) => (
              <span
                key={keyword}
                className="px-3 py-1 bg-surface-muted rounded-full"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Footer links */}
        <div className="mt-24 pt-12 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-content-muted">
            <p>© {new Date().getFullYear()} Marczelloo Tools. All rights reserved.</p>

            <div className="flex items-center gap-6">
              <a
                href="mailto:support@marczelloo.dev"
                className="hover:text-content-primary transition-colors-fast"
              >
                Contact
              </a>
              <Link
                href="/app"
                className="hover:text-content-primary transition-colors-fast"
              >
                Open App
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
