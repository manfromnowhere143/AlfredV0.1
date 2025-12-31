/**
 * MIDDLEWARE — Proper Database Session Support
 * 
 * Since we use strategy: 'database', we can't use withAuth (JWT-based).
 * Instead, we check for the session cookie and let API routes
 * handle actual authorization with getServerSession().
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for session cookie (database sessions use these)
  const sessionToken = 
    request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;
  
  // API routes - return 401 JSON if no session
  if (pathname.startsWith('/api/')) {
    if (!sessionToken) {
      // Special case: Let auth-related endpoints through
      if (pathname.startsWith('/api/auth/')) {
        return NextResponse.next();
      }
      
      return NextResponsjson(
        { error: 'Unauthorized', message: 'Please sign in' },
        { status: 401 }
      );
    }
    
    // Has session cookie - let the route handler verify with getServerSession
    return NextResponse.next();
  }
  
  // Page routes - redirect to home if no session
  if (!sessionToken) {
    const signInUrl = new URL('/', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // API routes that need auth
    '/api/chat/:path*',
    '/api/conversations/:path*',
    '/api/projects/:path*',
    '/api/files/:path*',
    '/api/usage/:path*',
    // Protected pages (add if needed)
    // '/dashboard/:path*',
  ],
};
