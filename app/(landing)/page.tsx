import type { Metadata } from "next";
import { toolRegistry, getEnabledTools } from "@/lib/featureFlags";
import {
  generatePageMetadata,
  generateWebsiteStructuredData,
  generateOrganizationStructuredData,
  generateFAQStructuredData,
} from "@/lib/seo";
import { StructuredData } from "@/lib/seo/structured-data";
import { landingFAQs } from "./faq-data";
import { LandingHero } from "./hero";
import { LandingFeatures } from "./features";
import { LandingToolGrid } from "./tool-grid";
import { LandingFAQ } from "./faq";
import { LandingSEO } from "./seo";

// ============================================================================
// METADATA
// ============================================================================

export const metadata: Metadata = generatePageMetadata({
  title: "Free Online Tools for Developers and Creators",
  description:
    "Powerful tools for video conversion, audio extraction, image compression, JSON formatting, and more. Fast, secure, and privacy-focused. No ads, no tracking.",
  keywords: [
    "online tools",
    "video converter",
    "audio extractor",
    "image compressor",
    "json formatter",
    "free tools",
    "privacy focused",
  ],
  path: "/",
});

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function LandingPage(): React.JSX.Element {
  const enabledTools = getEnabledTools();
  const categories = [...new Set(toolRegistry.map((t) => t.category))];

  // Structured data for SEO
  const websiteData = generateWebsiteStructuredData();
  const organizationData = generateOrganizationStructuredData();
  const faqData = generateFAQStructuredData(landingFAQs);

  return (
    <div className="min-h-screen">
      {/* Structured Data */}
      <StructuredData data={[websiteData, organizationData, faqData]} />

      {/* Hero Section */}
      <LandingHero />

      {/* Features Section */}
      <LandingFeatures />

      {/* Tool Preview Grid */}
      <LandingToolGrid tools={enabledTools} categories={categories} />

      {/* FAQ Section */}
      <LandingFAQ />

      {/* SEO Section */}
      <LandingSEO />
    </div>
  );
}
