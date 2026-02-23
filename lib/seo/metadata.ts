/**
 * SEO Metadata Generator
 * Generates Next.js metadata objects with consistent SEO
 */

import type { Metadata } from "next";
import { SEO_CONFIG, TOOL_SEO, CATEGORY_SEO } from "./config";

// ============================================================================
// TYPES
// ============================================================================

export interface PageSEOOptions {
  title: string;
  description?: string;
  keywords?: readonly string[];
  path?: string;
  image?: string;
  noIndex?: boolean;
}

export interface ToolSEOOptions {
  toolId: string;
  path: string;
}

export interface CategorySEOOptions {
  category: string;
  path: string;
  toolCount: number;
}

// ============================================================================
// BASE METADATA GENERATORS
// ============================================================================

/**
 * Generate metadata for a generic page
 */
export function generatePageMetadata(options: PageSEOOptions): Metadata {
  const {
    title,
    description = SEO_CONFIG.defaults.description,
    keywords = SEO_CONFIG.site.keywords,
    path = "",
    image,
    noIndex = false,
  } = options;

  const fullTitle = title === SEO_CONFIG.defaults.defaultTitle
    ? title
    : SEO_CONFIG.defaults.titleTemplate.replace("%s", title);

  const url = `${SEO_CONFIG.site.url}${path}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(", "),
    authors: [{ name: SEO_CONFIG.site.author }],
    creator: SEO_CONFIG.site.author,
    publisher: SEO_CONFIG.site.author,

    // Robots
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },

    // Canonical
    alternates: {
      canonical: url,
    },

    // Open Graph
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SEO_CONFIG.site.name,
      locale: SEO_CONFIG.site.locale,
      type: "website",
      images: image
        ? [{ url: image, width: 1200, height: 630 }]
        : [{ url: SEO_CONFIG.social.ogImage, width: 1200, height: 630 }],
    },

    // Twitter
    twitter: {
      card: SEO_CONFIG.social.twitterCard,
      title: fullTitle,
      description,
      creator: SEO_CONFIG.social.twitter,
      images: image ? [image] : [SEO_CONFIG.social.ogImage],
    },
  };
}

/**
 * Generate metadata for a tool page
 */
export function generateToolMetadata(options: ToolSEOOptions): Metadata {
  const { toolId, path } = options;
  const toolSeo = TOOL_SEO[toolId];

  if (!toolSeo) {
    return generatePageMetadata({
      title: "Tool Not Found",
      path,
      noIndex: true,
    });
  }

  return generatePageMetadata({
    title: toolSeo.title,
    description: toolSeo.description,
    keywords: [...toolSeo.keywords, ...SEO_CONFIG.site.keywords],
    path,
  });
}

/**
 * Generate metadata for a category page
 */
export function generateCategoryMetadata(options: CategorySEOOptions): Metadata {
  const { category, path, toolCount } = options;
  const categorySeo = CATEGORY_SEO[category];

  if (!categorySeo) {
    return generatePageMetadata({
      title: "Category Not Found",
      path,
      noIndex: true,
    });
  }

  return generatePageMetadata({
    title: categorySeo.title,
    description: `${categorySeo.description} ${toolCount} tools available.`,
    path,
  });
}

/**
 * Generate root layout metadata
 */
export function generateRootMetadata(): Metadata {
  return generatePageMetadata({
    title: SEO_CONFIG.defaults.defaultTitle,
    description: SEO_CONFIG.defaults.description,
    keywords: SEO_CONFIG.site.keywords,
    path: "",
  });
}

// ============================================================================
// JSON-LD STRUCTURED DATA
// ============================================================================

/**
 * Generate WebSite structured data
 */
export function generateWebsiteStructuredData(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_CONFIG.site.name,
    url: SEO_CONFIG.site.url,
    description: SEO_CONFIG.site.description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SEO_CONFIG.site.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate SoftwareApplication structured data for a tool
 */
export function generateToolStructuredData(options: {
  toolId: string;
  name: string;
  description: string;
  path: string;
  category: string;
}): object {
  const { name, description, path, category } = options;
  const url = `${SEO_CONFIG.site.url}${path}`;

  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url,
    applicationCategory: getCategorySchema(category),
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    browserRequirements: "Requires JavaScript",
    softwareVersion: "1.0",
    author: {
      "@type": "Organization",
      name: SEO_CONFIG.site.name,
      url: SEO_CONFIG.site.url,
    },
  };
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbStructuredData(
  items: Array<{ name: string; path: string }>
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SEO_CONFIG.site.url}${item.path}`,
    })),
  };
}

/**
 * Generate Organization structured data
 */
export function generateOrganizationStructuredData(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO_CONFIG.site.name,
    url: SEO_CONFIG.site.url,
    logo: `${SEO_CONFIG.site.url}/logo.png`,
    sameAs: [
      `https://twitter.com/${SEO_CONFIG.social.twitter.replace("@", "")}`,
    ],
  };
}

/**
 * Generate FAQ structured data
 */
export function generateFAQStructuredData(
  faqs: Array<{ question: string; answer: string }>
): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getCategorySchema(category: string): string {
  const categoryMap: Record<string, string> = {
    media: "MultimediaApplication",
    dev: "DeveloperApplication",
    converter: "UtilitiesApplication",
    downloader: "UtilitiesApplication",
  };

  return categoryMap[category] ?? "UtilitiesApplication";
}

/**
 * Combine multiple JSON-LD objects into a script tag content
 */
export function combineStructuredData(...data: object[]): string {
  if (data.length === 1) {
    return JSON.stringify(data[0]);
  }

  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": data,
  });
}
