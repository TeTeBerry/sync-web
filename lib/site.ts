const PRODUCTION_SITE_URL = 'https://www.ravenclub.tech';

export function getSiteUrl(): string {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    return PRODUCTION_SITE_URL;
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production.replace(/\/$/, '')}`;

  const deployment = process.env.VERCEL_URL?.trim();
  if (deployment) return `https://${deployment.replace(/\/$/, '')}`;

  return 'http://localhost:3000';
}
