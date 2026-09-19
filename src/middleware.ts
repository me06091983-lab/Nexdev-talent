import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshes the session and sets updated cookies
  const { data: { user } } = await supabase.auth.getUser()

  // Every API route requires a signed-in user; cron authenticates itself with CRON_SECRET.
  const pathname = request.nextUrl.pathname
  if (!user && pathname.startsWith('/api/') && !pathname.startsWith('/api/cron/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user && user.app_metadata?.role !== 'admin') {
    const matches = (prefixes: string[]) => prefixes.some(p => pathname === p || pathname.startsWith(p + '/'))
    if (matches(ADMIN_ONLY_API_PREFIXES)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (matches(ADMIN_ONLY_PAGE_PREFIXES)) {
      const url = request.nextUrl.clone()
      url.pathname = '/recruiter'
      url.search = ''
      const redirect = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach(c => redirect.cookies.set(c))
      return redirect
    }
  }

  return supabaseResponse
}

const ADMIN_ONLY_PAGE_PREFIXES = [
  '/dashboard', '/pipeline', '/clients', '/partners', '/contracts',
  '/timesheets', '/invoices', '/facturare', '/admin', '/roles',
]

const ADMIN_ONLY_API_PREFIXES = [
  '/api/contracts', '/api/timesheets', '/api/facturi', '/api/facturi-summary',
  '/api/facturi-tva', '/api/dashboard', '/api/admin',
]

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
