import { type NextAuthOptions, type User } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db, users, eq } from '@alfred/database';

async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

async function createUser(data: { email: string; externalId?: string | null }) {
  const [user] = await db.insert(users).values({ email: data.email, externalId: data.externalId ?? null }).returning();
  return user;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: 'email',
      name: 'Email',
      credentials: { email: { label: 'Email', type: 'email' } },
      async authorize(credentials): Promise<User | null> {
        const email = credentials?.email?.toLowerCase().trim();
        if (!email) return null;
        let user = await findUserByEmail(email);
        if (!user) user = await createUser({ email });
        return { id: user.id, email: user.email!, name: user.email?.split('@')[0] ?? null };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'email') return true;
      const email = user.email?.toLowerCase().trim();
      if (!email) return false;
      const existing = await findUserByEmail(email);
      if (!existing) await createUser({ email, externalId: account?.providerAccountId });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) { token.userId = user.id; token.email = user.email ?? undefined; }
      if (!token.userId && token.email) {
        const dbUser = await findUserByEmail(token.email as string);
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) (session.user as any).id = token.userId;
      return session;
    },
  },
  pages: { signIn: '/', error: '/' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

declare module 'next-auth' {
  interface Session { user: { id: string; email: string; name?: string | null; image?: string | null } }
}
declare module 'next-auth/jwt' {
  interface JWT { userId?: string; email?: string }
}
