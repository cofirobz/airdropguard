import { Helmet } from "react-helmet-async";
import { SEO_SITE_NAME, SEO_SITE_URL } from "../lib/seo";

type SEOProps = {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  schema?: object | object[];
  type?: "website" | "article";
  noindex?: boolean;
};

const SITE_NAME = SEO_SITE_NAME;
const SITE_URL = SEO_SITE_URL;
const DEFAULT_IMAGE = `${SITE_URL}/airdrop_guards.png`;

export default function SEO({
  title,
  description,
  canonical,
  image = DEFAULT_IMAGE,
  schema,
  type = "website",
  noindex = false,
}: SEOProps) {
  const pageUrl = canonical || SITE_URL;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow,max-image-preview:large" />
      )}

      <link rel="canonical" href={pageUrl} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:type" content={type} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}