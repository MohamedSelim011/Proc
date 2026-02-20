'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ClipboardList,
  Mail,
  KeyRound,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/apiFetch'
import { BRAND_LOGO_URL, COMPANY_NAME } from '@/lib/branding'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('wujha-remembered-email')
    if (rememberedEmail) {
      setFormData((prev) => ({ ...prev, email: rememberedEmail, remember: true }))
    }
  }, [])

  // Preserve existing behavior: if token exists, go to dashboard
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      router.push('/procurement/dashboard')
    }
  }, [router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (formData.remember) {
      localStorage.setItem('wujha-remembered-email', formData.email)
    } else {
      localStorage.removeItem('wujha-remembered-email')
    }

    setIsLoading(true)
    try {
      const response = await apiFetch('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage =
          data?.error?.message ??
          (response.status === 401
            ? 'Invalid email or password'
            : 'Unable to sign in. Please try again.')
        showToast('error', errorMessage)
        return
      }

      // Preserve existing storage keys and auth behavior
      if (data?.token) {
        localStorage.setItem('token', data.token)
      }

      if (data?.user) {
        const role = data.user.role || 'REQUESTOR'
        localStorage.setItem('role', role)
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      showToast('success', `Welcome back, ${data?.user?.name ?? 'User'}!`)
      window.location.href = '/procurement/dashboard'
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Unexpected error during sign in',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/signin-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/45" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-8 lg:px-10">
        <div className="w-full max-w-[1440px]">
          <div className="hidden lg:grid lg:grid-cols-[1fr_540px] lg:items-center lg:gap-12">
            <div className="px-6">
              <div className="mb-10">
                <h1 className="text-[44px] font-semibold leading-none text-white">{COMPANY_NAME}</h1>
                <p className="mt-3 text-[28px] font-medium leading-none text-white/90">
                  Procurement Management System
                </p>
              </div>

              <div className="max-w-[620px] text-white">
                <h2 className="text-[72px] font-light leading-[0.95] tracking-[-0.02em]">Welcome</h2>
                <h3 className="mt-1 text-[90px] font-bold leading-[0.9] tracking-[-0.02em]">Back</h3>
                <p className="mt-8 max-w-[520px] text-[28px] leading-[1.3] text-white/85">
                  Access your procurement management dashboard. Secure, compliant, and designed for enterprise excellence.
                </p>
              </div>
            </div>

            <div className="w-full justify-self-end">
              <div className="rounded-[24px] bg-white px-7 py-8 shadow-2xl">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-16 w-44 items-center justify-start bg-white">
                    {BRAND_LOGO_URL ? (
                      <img
                        src={BRAND_LOGO_URL}
                        alt={`${COMPANY_NAME} logo`}
                        className="h-full w-full object-contain object-left"
                      />
                    ) : (
                      <ClipboardList className="h-6 w-6 text-slate-700" />
                    )}
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="text-[42px] font-semibold leading-none text-slate-900">Sign in</h4>
                  <p className="mt-3 text-[20px] leading-tight text-slate-500">
                    Enter your credentials to access your account
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                  <div>
                    <label htmlFor="email" className="mb-2 block text-[19px] font-medium text-slate-700">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 pl-14 pr-4 text-[20px] text-slate-700 outline-none transition focus:border-wujha-primary focus:bg-white"
                        placeholder="admin@company.com"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="mb-2 block text-[19px] font-medium text-slate-700">
                      Password
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="h-[52px] w-full rounded-2xl border border-slate-200 bg-slate-50 pl-14 pr-12 text-[20px] text-slate-700 outline-none transition focus:border-wujha-primary focus:bg-white"
                        placeholder="........."
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={formData.remember}
                      onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-wujha-primary focus:ring-wujha-primary"
                      disabled={isLoading}
                    />
                    <label htmlFor="remember" className="ml-2 text-sm text-slate-600">
                      Remember my email
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 inline-flex h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-wujha-primary px-6 text-[24px] font-semibold text-white transition hover:bg-wujha-primary-hover focus:outline-none focus:ring-2 focus:ring-wujha-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in now
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md lg:hidden">
            <div className="rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-32 items-center justify-start bg-white">
                  {BRAND_LOGO_URL ? (
                    <img
                      src={BRAND_LOGO_URL}
                      alt={`${COMPANY_NAME} logo`}
                      className="h-full w-full object-contain object-left"
                    />
                  ) : (
                    <ClipboardList className="h-5 w-5 text-slate-700" />
                  )}
                </div>
              </div>
              <h4 className="text-3xl font-semibold text-slate-900">Sign in</h4>
              <p className="mt-2 text-sm text-slate-500">Enter your credentials to access your account</p>
              <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
                <div>
                  <label htmlFor="email-mobile" className="mb-1 block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email-mobile"
                      type="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-base text-slate-700 outline-none focus:border-wujha-primary focus:bg-white"
                      placeholder="admin@company.com"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password-mobile" className="mb-1 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password-mobile"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-10 text-base text-slate-700 outline-none focus:border-wujha-primary focus:bg-white"
                      placeholder="........."
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-wujha-primary px-4 text-base font-semibold text-white hover:bg-wujha-primary-hover disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? 'Signing in...' : 'Sign in now'}
                  {!isLoading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-5 z-10 hidden items-center gap-4 text-[18px] text-white/85 lg:flex">
        <span className="inline-flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Secured by SSL Encryption
        </span>
        <span>(c) {new Date().getFullYear()} {COMPANY_NAME} Procurement System. All rights reserved.</span>
      </div>
    </div>
  )
}
