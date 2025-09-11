import { NextRequest, NextResponse } from 'next/server';

// 临时简化的中间件用于调试
export async function middleware(request: NextRequest) {
  try {
    console.log('Middleware called for:', request.nextUrl.pathname);
    
    // 跳过静态资源
    if (
      request.nextUrl.pathname.includes('.') ||
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/api/') ||
      request.nextUrl.pathname.startsWith('/trpc/')
    ) {
      return NextResponse.next();
    }

    // 简单的locale重定向逻辑
    const pathname = request.nextUrl.pathname;
    const supportedLocales = ['en', 'zh', 'ko', 'ja'];
    const defaultLocale = 'zh';

    // 检查是否已经有locale
    const hasLocale = supportedLocales.some(locale => 
      pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (!hasLocale && pathname !== '/') {
      // 重定向到默认locale
      const url = new URL(`/${defaultLocale}${pathname}`, request.url);
      console.log('Redirecting to:', url.toString());
      return NextResponse.redirect(url);
    }

    // 如果是根路径，重定向到默认locale
    if (pathname === '/') {
      const url = new URL(`/${defaultLocale}`, request.url);
      console.log('Redirecting root to:', url.toString());
      return NextResponse.redirect(url);
    }

    console.log('Proceeding with request:', pathname);
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
