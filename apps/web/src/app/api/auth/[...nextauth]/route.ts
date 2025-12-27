// ═══════════════════════════════════════════════════════════════════════════════
// apps/web/src/app/api/auth/[...nextauth]/route.ts
// Production-grade NextAuth handler with auto user provisioning
// ═══════════════════════════════════════════════════════════════════════════════

import NextAuth, { type NextAuthOptions, type User } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db, users, eq } from '@alfred/database';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const LOG_PREFIX = '[AUTH]';

const log = {
  info: (msg: string, data?: any) => console.log(`${LOG_PREFIX} ✅ ${msg}`, data ?? ''),
  warn: (msg: string, data?: any) => console.warn(`${LOG_PREFIX} ⚠️ ${msg}`, data ?? ''),
  error: (msg: string, data?: any) => console.error(`${LOG_PREFIX} ❌ ${msg}`, data ?? ''),
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user ?? null;
}

async function findUserById(id: string) {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return user ?? null;
}

async function createUser(data: { email: string; externalId?: string | null }) {
  const [user] = await db
    .insert(users)
    .values({
      email: data.email,
      externalId: data.externalId ?? null,
    })
    .returning();
  return user;
}

async function updateUserExternalId(userId: string, externalId: string) {
  await db
    .update(users)
    .set({ externalId, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const authOptions: NextAuthOptions = {
  providers: [
    // ─────────────────────────────────────────────────────────────────────────
    // GOOGLE OAUTH
    // ─────────────────────────────────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL/CREDENTIALS (Magic link style - no password)
    // ─────────────────────────────────────────────────────────────────────────
    CredentialsProvider({
      id: 'email',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'you@example.com' },
      },
      async authorize(credentials): Promise<User | null> {
        const email = credentials?.email?.toLowerCase().trim();
        if (!email) {
          log.warn('Credentials auth attempted without email');
          return null;
        }

        try {
          let user = await findUserByEmail(email);

          if (!user) {
            user = await createUser({ email });
            log.info(`Created new user via email: ${email}`);
          } else {
            log.info(`Existing user signed in via email: ${email}`);
          }

          return {
            id: user.id,
            email: user.email!,
            name: user.email?.split('@')[0] ?? null,
          };
        } catch (error) {
          log.error('Credentials auth error', error);
          return null;
        }
      },
    }),
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACKS
  // ═══════════════════════════════════════════════════════════════════════════

  callbacks: {
    // ─────────────────────────────────────────────────────────────────────────
    // SIGN IN - Auto-provision users for OAuth providers
    // ─────────────────────────────────────────────────────────────────────────
    async signIn({ user, account, profile }) {
      // Skip for credentials - handled in authorize()
      if (account?.provider === 'email') return true;
      
      const email = user.email?.toLowerCase().trim();
      if (!email) {
        log.warn('OAuth sign-in attempted without email', { provider: account?.provider });
        return false;
      }

      try {
        const existingUser = await findUserByEmail(email);

        if (!existingUser) {
          // ═══ CREATE NEW USER ═══
          const newUser = await createUser({
            email,
            externalId: account?.providerAccountId ?? null,
          });
          log.info(`Created user via ${account?.provider}: ${email}`, { userId: newUser.id });
        } else {
          // ═══ UPDATE EXTERNAL ID IF MISSING ═══
          if (!existingUser.externalId && account?.providerAccountId) {
            await updateUserExternalId(existingUser.id, account.providerAccountId);
            log.info(`Updated externalId for: ${email}`);
          } else {
            log.info(`Existing user signed in via ${account?.provider}: ${email}`);
          }
        }

        return true;
      } catch (error) {
        log.error('signIn callback error', { email, error });
        // Still allow sign-in - don't block user due to DB issues
        return true;
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // JWT - Attach database user ID to token
    // ─────────────────────────────────────────────────────────────────────────
    async jwt({ token, user, account, trigger }) {
      // On initial sign-in, user object is available
      if (user?.id) {
        token.userId = user.id;
        token.email = user.email;
      }

      // For OAuth users, fetch DB id if not present
      if (!token.userId && token.email) {
        try {
          const dbUser = await findUserByEmail(token.email as string);
          if (dbUser) {
            token.userId = dbUser.id;
          }
        } catch (error) {
          log.error('jwt callback - failed to fetch user', { email: token.email, error });
        }
      }

      return token;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SESSION - Expose user ID to client
    // ─────────────────────────────────────────────────────────────────────────
    async session({ session, token }) {
      if (token.userId && session.user) {
        (session.user as any).id = token.userId;
      }
      return session;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // REDIRECT - Custom redirect handling
    // ─────────────────────────────────────────────────────────────────────────
    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allow same-origin URLs
      if (new URL(url).origin === baseUrl) return url;
      // Default to base URL
      return baseUrl;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGES
  // ═══════════════════════════════════════════════════════════════════════════

  pages: {
    signIn: '/',
    error: '/',
    // signOut: '/auth/signout',
    // verifyRequest: '/auth/verify',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SESSION STRATEGY
  // ═══════════════════════════════════════════════════════════════════════════

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY
  // ═══════════════════════════════════════════════════════════════════════════

  secret: process.env.NEXTAUTH_SECRET,
  
  debug: process.env.NODE_ENV === 'development',

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENTS (optional logging)
  // ═══════════════════════════════════════════════════════════════════════════

  events: {
    async signIn({ user, account }) {
      log.info(`Sign-in complete: ${user.email} via ${account?.provider ?? 'credentials'}`);
    },
    async signOut({ token }) {
      log.info(`Sign-out: ${token.email}`);
    },
    async createUser({ user }) {
      log.info(`User created event: ${user.email}`);
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE AUGMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    email?: string;
  }
}