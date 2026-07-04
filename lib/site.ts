function normalizeSiteUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return normalizeSiteUrl(configured);

  if (process.env.VERCEL_ENV === 'production') {
    const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (production) return normalizeSiteUrl(production);
  }

  const deployment = process.env.VERCEL_URL?.trim();
  if (deployment) return normalizeSiteUrl(deployment);

  return 'http://localhost:3002';
}
