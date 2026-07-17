import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import type { Provider } from 'next-auth/providers';
import { ravenAuthMongoClient } from './lib/auth/mongodb';

const hasMongo = Boolean(process.env.MONGODB_URI?.trim());
const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim());

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
  session: { strategy: hasMongo ? 'database' : 'jwt', maxAge: 60 * 60 * 24 * 30 },
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
