import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = [
    '/admin', '/dashboard',
    '/api/articulos', '/api/despachos', '/api/recepciones', '/api/inventario', '/api/usuarios',
    '/api/configuracion', '/api/catalogo-sigaf', '/api/proveedores', '/api/bitacora',
    '/api/exportar', '/api/documentos-recepcion', '/api/ajustes', '/api/cortes',
    '/api/bodegas', '/api/unidades-receptoras',
  ]
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // Exclude certain API paths that should be public
  const publicApiPaths = ['/api/auth/login', '/api/auth/logout', '/api/health', '/api/seed']
  const isPublicApiPath = publicApiPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtectedPath && !isPublicApiPath && !user) {
    // For API routes, return 401
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }
    // For pages, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Role-based page restrictions (APIs are protected in route handlers)
  const ROLE_RESTRICTED_ROUTES = [
    { path: '/admin', roles: ['ADMINISTRADOR'] },
    { path: '/recepciones/nueva', roles: ['ADMINISTRADOR', 'OPERADOR'] },
    { path: '/despachos/nuevo', roles: ['ADMINISTRADOR', 'OPERADOR'] },
    { path: '/ajustes/nuevo', roles: ['ADMINISTRADOR', 'OPERADOR'] },
    { path: '/cortes/nuevo', roles: ['ADMINISTRADOR', 'OPERADOR'] },
  ]

  const pathname = request.nextUrl.pathname
  if (user && !pathname.startsWith('/api/')) {
    const userRole = user.app_metadata?.rol || user.user_metadata?.rol
    const matched = ROLE_RESTRICTED_ROUTES.find(r => pathname.startsWith(r.path))
    if (matched && !matched.roles.includes(userRole)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // If user is logged in and trying to access login page, redirect to dashboard
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
