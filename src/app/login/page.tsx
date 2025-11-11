'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, Mail, ShoppingCart } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      if (result?.ok) {
        // Check if password change is required
        const response = await fetch('/api/auth/session')
        const session = await response.json()

        if (session?.user?.mustChangePassword) {
          router.push('/change-password')
        } else {
          router.push(searchParams.get('callbackUrl') || '/')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-3 text-center pb-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-xl">
            <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-3 shadow-lg">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-white">WUJHA Procurement</CardTitle>
            <CardDescription className="text-blue-100 text-base">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 pb-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800 font-medium">{error}</AlertDescription>
                </Alert>
              )}

              {searchParams.get('error') === 'SessionRequired' && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-800 font-medium">
                    Please sign in to access this page.
                  </AlertDescription>
                </Alert>
              )}

              {searchParams.get('passwordChanged') === 'true' && (
                <Alert className="border-green-500 bg-green-50">
                  <AlertDescription className="text-green-800 font-medium">
                    Password changed successfully! Please sign in with your new password.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-semibold text-sm">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-blue-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@wujha.om"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-semibold text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-blue-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-base shadow-lg shadow-blue-500/30"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600 font-medium mb-2">Default admin credentials:</p>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="font-mono text-sm text-gray-800 font-semibold">
                  admin@wujha.om / Admin@123
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            © 2024 WUJHA Procurement System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
