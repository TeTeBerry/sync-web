import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import type { Provider } from 'next-auth/providers';
import { ravenAuthMongoClient } from './lib/auth/mongodb';

function canonicalAuthUrl(value?: string) {
  if (!value?.trim()) return undefined;
  try {
    return new URL(value.trim()).origin;
  } catch {
    return undefined;
  }
}

// Auth.js otherwise derives the OAuth callback origin from the incoming Host
// header. Keep it pinned to the canonical deployment URL so aliases such as
// www/non-www or a platform hostname cannot create a Google redirect mismatch.
const configuredAuthUrl = canonicalAuthUrl(
  process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
);
if (!process.env.AUTH_URL && configuredAuthUrl) {
  process.env.AUTH_URL = configuredAuthUrl;
}

const hasMongo = Boolean(process.env.MONGODB_URI?.trim());
const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim());
const hasDevMockLogin = process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_MOCK_LOGIN !== 'false';

const providers: Provider[] = [];

if (hasGoogle) {
  providers.push(Google({
    // Keep the authorization request self-contained. Google discovery can fail in
    // restricted server environments even though the browser can reach Google.
    authorization: {
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
      params: { scope: 'openid email profile' },
    },
    token: process.env.AUTH_GOOGLE_TOKEN_URL?.trim() || 'https://www.googleapis.com/oauth2/v4/token',
    userinfo: process.env.AUTH_GOOGLE_USERINFO_URL?.trim() || 'https://www.googleapis.com/oauth2/v3/userinfo',
  }));
}

if (hasDevMockLogin) {
  providers.push(Credentials({
    id: 'dev-mock',
    name: 'Development mock',
    credentials: {},
    async authorize() {
      return {
        id: 'raven-dev-user',
        email: 'dev@raven.local',
        name: 'Raven Dev',
        image: null,
      };
    },
  }));
}

const adapter = hasMongo ? MongoDBAdapter(ravenAuthMongoClient, {
  collections: {
    Users: 'raven_auth_users',
    Accounts: 'raven_auth_accounts',
    Sessions: 'raven_auth_sessions',
    VerificationTokens: 'raven_auth_verification_tokens',
  },
}) : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...(adapter ? { adapter } : {}),
  providers,
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? (
    process.env.NODE_ENV === 'production' ? undefined : 'raven-local-auth-secret-change-me'
  ),
  // Credentials providers use JWT sessions. Keep production Google sessions in
  // MongoDB while making the local mock path self-contained.
  session: { strategy: hasMongo && !hasDevMockLogin ? 'database' : 'jwt', maxAge: 60 * 60 * 24 * 30 },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, user, token }) {
      session.user.id = user?.id ?? String(token.userId ?? '');
      return session;
    },
    redirect({ url, baseUrl }) {
      // Auth.js normally protects this too; keep an explicit same-origin allowlist.
      try {
        const destination = new URL(url, baseUrl);
        return destination.origin === baseUrl ? destination.toString() : baseUrl;
      } catch {
        return baseUrl;
      }
    },
  },
  pages: { signIn: '/auth/sign-in' },
});
