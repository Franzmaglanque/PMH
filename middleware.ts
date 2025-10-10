import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function runs before every request
export function middleware(request: NextRequest) {
  // Get the token from cookies or localStorage equivalent
  // In middleware, we check cookies since localStorage is client-side only
  const token = request.cookies.get('auth_token')?.value;
  
  // Get the current path the user is trying to access
  const { pathname } = request.nextUrl;
  
  // If user is trying to access a protected route without a token
  if (!token && pathname.startsWith('/batch')) {
    // Redirect them to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If user is logged in and tries to access login page
  if (token && pathname === '/login') {
    // Redirect them to dashboard since they're already logged in
    return NextResponse.redirect(new URL('/batch', request.url));
  }
  
  // Allow the request to continue
  return NextResponse.next();
}

// Configure which routes this middleware should run on
export const config = {
  // Match all routes under /batch and any other protected routes
  matcher: ['/batch/:path*', '/dashboard/:path*', '/login'],
};