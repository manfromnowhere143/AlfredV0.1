/**
 * AUTH.TS — Alfred Authentication Configuration
 * @version 2.1.0
 */

import { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens } from '@alfred/database';
import { sendMagicLinkEmail } from '@/lib/emails/send-magic-link';

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as any,

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    EmailProvider({
      server: {},
      from: process.env.EMAIL_FROM || 'Alfred <noreply@alfr.app>',
      maxAge: 24 * 60 * 60,
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        await sendMagicLinkEmail({
          to: email,
          magicLink: url,
          from: provider.from as string,
        });
      },
    }),
  ],

  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  pages: {
    signIn: '/',
    verifyRequest: '/auth/check-email',
    error: '/',
  },

  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn() {
      return true;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

declare module 'next-auth' {
  interface Session {
    user: { id: string; email: string; name?: string | null; image?: string | null };
  }
}
