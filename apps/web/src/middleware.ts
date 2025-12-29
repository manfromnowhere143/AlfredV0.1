import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/',
    },
  }
);

export const config = {
  matcher: [
    '/api/chat/:path*',
    '/api/conversations/:path*',
    '/api/projects/:path*',
    '/api/files/:path*',
  ],
};
