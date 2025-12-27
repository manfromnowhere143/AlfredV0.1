import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db, users, eq } from '@alfred/database';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        
        let [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);
        
        if (!user) {
          [user] = await db
            .insert(users)
            .values({ email: credentials.email as string })
            .returning();
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.email?.split('@')[0],
        };
      },
    }),
  ],
  callbacks: {
    // ADD THIS - Auto-create user on Google sign in
    async signIn({ user, account }) {
      if (!user.email) return false;
      
      try {
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);
        
        if (!existing) {
          await db.insert(users).values({
            email: user.email,
            externalId: account?.providerAccountId || null,
          });
          console.log(`[AUTH] ✅ Created new user: ${user.email}`);
        } else {
          console.log(`[AUTH] ✅ User exists: ${user.email}`);
        }
        return true;
      } catch (error) {
        console.error('[AUTH] ❌ Error:', error);
        return true;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      // If no id yet, fetch from DB
      if (!token.id && token.email) {
        const [dbUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, token.email as string))
          .limit(1);
        if (dbUser) token.id = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };