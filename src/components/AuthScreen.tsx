import { useState } from 'react'
import { Cloud } from 'lucide-react'

import { ActionFeedback } from '@/components/ActionFeedback'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export type AuthMode = 'login' | 'register'

export function AuthScreen({
  mode,
  onModeChange,
  onSubmit,
}: {
  mode: AuthMode
  onModeChange: (mode: AuthMode) => void
  onSubmit: (values: { username: string; email?: string; password: string }) => Promise<void>
}) {
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const isRegister = mode === 'register'

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-5">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Cloud aria-hidden="true" className="size-6" />
          </div>
          <p className="text-lg font-semibold tracking-tight">HomeCloud</p>
          <p className="mt-1 text-sm text-muted-foreground">Your files, wherever you are.</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>{isRegister ? 'Create your account' : 'Welcome back'}</CardTitle>
            <CardDescription>
              {isRegister
                ? 'Get started with your personal cloud space.'
                : 'Sign in to access your files and folders.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
              const form = new FormData(event.currentTarget)
              setBusy(true)
              setNotice('')
              void onSubmit({
                username: String(form.get('username') || ''),
                email: isRegister ? String(form.get('email') || '') : undefined,
                password: String(form.get('password') || ''),
              }).catch((error: unknown) => setNotice(error instanceof Error ? error.message : 'Could not sign in.'))
                .finally(() => setBusy(false))
              }}
            >
              {isRegister && (
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="auth-username">Username</label>
                  <Input autoComplete="username" id="auth-username" name="username" placeholder="Choose a username" required />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor={isRegister ? 'auth-email' : 'auth-username'}>{isRegister ? 'Email' : 'Username'}</label>
                <Input autoComplete={isRegister ? 'email' : 'username'} id={isRegister ? 'auth-email' : 'auth-username'} name={isRegister ? 'email' : 'username'} placeholder={isRegister ? 'you@example.com' : 'Your username'} required type={isRegister ? 'email' : 'text'} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="auth-password">Password</label>
                <Input
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  id="auth-password"
                  name="password"
                  placeholder="Enter your password"
                  required
                  type="password"
                />
              </div>
              {notice && <ActionFeedback message={notice} variant="error" />}
              <Button className="w-full" disabled={busy} type="submit">
                {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
              </Button>
            </form>
            <div className="mt-5 border-t pt-4 text-center text-sm">
              <span className="text-muted-foreground">
                {isRegister ? 'Already have an account?' : 'New to HomeCloud?'}
              </span>{' '}
              <Button
                className="h-auto p-0 font-medium"
                onClick={() => {
                  setNotice('')
                  onModeChange(isRegister ? 'login' : 'register')
                }}
                type="button"
                variant="link"
              >
                {isRegister ? 'Sign in' : 'Create an account'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
