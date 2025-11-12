import { Helmet } from 'react-helmet-async';

interface ArticleSEOProps {
  title: string;
  description: string;
  slug: string;
  imageUrl?: string;
  publishedAt?: string;
  modifiedAt?: string;
  category?: string;
}

export function ArticleSEO({
  title,
  description,
  slug,
  imageUrl,
  publishedAt,
  modifiedAt,
  category,
}: ArticleSEOProps) {
  const url = `${window.location.origin}/base-conhecimento/${slug}`;
  const siteName = 'Base de Conhecimento';

  // Schema.org JSON-LD
  const schemaOrgData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    image: imageUrl || `${window.location.origin}/og-image.png`,
    datePublished: publishedAt,
    dateModified: modifiedAt || publishedAt,
    author: {
      '@type': 'Organization',
      name: siteName,
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: `${window.location.origin}/favicon.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };

  return (
    <Helmet>
      {/* Meta tags básicas */}
      <title>{title} | {siteName}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="article" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      <meta property="og:site_name" content={siteName} />
      {publishedAt && <meta property="article:published_time" content={publishedAt} />}
      {modifiedAt && <meta property="article:modified_time" content={modifiedAt} />}
      {category && <meta property="article:section" content={category} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}

      {/* Schema.org JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(schemaOrgData)}
      </script>

      {/* Acessibilidade */}
      <html lang="pt-BR" />
    </Helmet>
  );
}