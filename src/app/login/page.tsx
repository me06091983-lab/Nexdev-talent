import { AlertCircle } from 'lucide-react'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  const errorMessage =
    error === 'invalid_credentials'
      ? 'Incorrect email or password. Please try again.'
      : error === 'unauthorized'
      ? 'You do not have permission to access this page.'
      : error
      ? 'An error occurred. Please try again.'
      : null

  return (
    <div className="min-h-screen bg-[#0B1A33] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-white font-bold text-3xl tracking-tight">
            <span className="text-[#2AA3FF]">Nex</span>Dev Talent
          </h1>
          <p className="text-white/50 text-sm mt-2">Internal recruitment platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h2 className="text-gray-900 font-semibold text-xl mb-6">Sign in</h2>

          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-700">
              <AlertCircle size={15} className="flex-shrink-0" />
              {errorMessage}
            </div>
          )}

          <form action="/auth/login" method="post" className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF] focus:border-transparent transition"
                placeholder="email@nexdev.vip"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF] focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#2AA3FF] hover:bg-[#1a8fe0] text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
