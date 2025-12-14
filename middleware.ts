import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
);

const COOKIE_NAME = 'auth-token';

// Rutas públicas que no requieren autenticación
const publicRoutes = ['/login', '/api/auth/login', '/api/health'];

// Rutas de API que no deben redirigir
const apiRoutes = ['/api/'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Permitir archivos estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Obtener token de cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Si no hay token
  if (!token) {
    // Para rutas API, retornar 401
    if (apiRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }
    // Para otras rutas, redirigir a login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verificar token
  try {
    await jwtVerify(token, JWT_SECRET);

    // Si el usuario está autenticado y trata de acceder a login, redirigir a dashboard
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch {
    // Token inválido
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ success: false, error: 'Sesión expirada' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));

    // Limpiar cookie inválida
    response.cookies.set(COOKIE_NAME, '', { maxAge: 0 });
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
