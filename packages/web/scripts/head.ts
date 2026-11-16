export const site = {
  origin: "https://assay.coey.dev",
  name: "assay",
  title: "assay · spin up a fleet of coding agents",
  description:
    "Write a plan, run one command, and get a fleet of coding agents. Each gets its own copy of your repo. A test it can't see checks the work.",
  repo: "https://github.com/acoyfellow/assay",
  author: "Jordan Coeyman",
  x: "@acoyfellow",
  image: "/og.png",
  imageAlt: "assay. Spin up a fleet of coding agents. A grid of agents, some passed, some failed.",
} as const;

const escapeAttribute = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");

type HeadInput = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  jsonLd?: object;
};

export const headTags = ({ title, description, path, type = "website", jsonLd }: HeadInput) => {
  const url = `${site.origin}${path}`;
  const image = `${site.origin}${site.image}`;
  const tags = [
    `<title>${escapeAttribute(title)}</title>`,
    `<meta name="description" content="${escapeAttribute(description)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="index, follow, max-image-preview:large">`,
    `<meta name="author" content="${site.author}">`,
    `<meta name="theme-color" content="#ffffff">`,
    `<meta name="color-scheme" content="light">`,
    `<link rel="icon" href="/favicon.ico" sizes="32x32">`,
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
    `<link rel="manifest" href="/manifest.webmanifest">`,
    `<meta name="apple-mobile-web-app-title" content="${site.name}">`,
    `<meta name="mobile-web-app-capable" content="yes">`,
    `<link rel="alternate" type="text/plain" title="llms.txt" href="/llms.txt">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="${site.name}">`,
    `<meta property="og:title" content="${escapeAttribute(title)}">`,
    `<meta property="og:description" content="${escapeAttribute(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${escapeAttribute(site.imageAlt)}">`,
    `<meta property="og:locale" content="en_US">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:site" content="${site.x}">`,
    `<meta name="twitter:creator" content="${site.x}">`,
    `<meta name="twitter:title" content="${escapeAttribute(title)}">`,
    `<meta name="twitter:description" content="${escapeAttribute(description)}">`,
    `<meta name="twitter:image" content="${image}">`,
    `<meta name="twitter:image:alt" content="${escapeAttribute(site.imageAlt)}">`,
  ];
  if (jsonLd) tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`);
  return tags.join("\n");
};

export const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${site.origin}/#website`,
      url: `${site.origin}/`,
      name: site.name,
      description: site.description,
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${site.origin}/#software`,
      name: site.name,
      description: site.description,
      url: `${site.origin}/`,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "macOS, Linux",
      codeRepository: site.repo,
      author: { "@type": "Person", name: site.author, url: "https://x.com/acoyfellow" },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

export const docJsonLd = (
  title: string,
  description: string,
  path: string,
  crumbs: { name: string; path: string }[],
) => ({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "TechArticle",
      headline: title,
      description,
      url: `${site.origin}${path}`,
      inLanguage: "en",
      author: { "@type": "Person", name: site.author },
      isPartOf: { "@id": `${site.origin}/#website` },
      image: `${site.origin}${site.image}`,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: `${site.origin}${crumb.path}`,
      })),
    },
  ],
});

export const swRegister = `<script>if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/sw.js"))</script>`;
