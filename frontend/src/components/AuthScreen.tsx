import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase.ts'

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    setPending(true)

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        if (!data.session) {
          setNotice('Account created. Confirm the email, then log in.')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Authentication failed')
    } finally {
      setPending(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <section className="w-full max-w-md rounded-[28px] border border-line bg-paper px-8 py-10 shadow-[0_24px_60px_rgb(80_48_28_/_8%)]">
        <p className="text-xs font-medium tracking-[0.22em] text-clay uppercase">Private vault</p>
        <h1 className="mt-3 font-serif text-5xl font-medium tracking-tight">Tethr</h1>
        <p className="mt-2 text-lg text-muted">Moments kept for two.</p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-1.5 w-full rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-clay"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-1.5 w-full rounded-2xl border border-line bg-cream px-4 py-3 outline-none focus:border-clay"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="text-sm text-clay-deep">{error}</p> : null}
          {notice ? <p className="text-sm text-moss">{notice}</p> : null}

          <button
            className="w-full rounded-full bg-clay px-4 py-3 font-medium text-paper hover:bg-clay-deep"
            type="submit"
            disabled={pending}
          >
            {pending ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
          </button>
        </form>

        <button
          className="mt-5 text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
          type="button"
          onClick={() => {
            setMode(isLogin ? 'signup' : 'login')
            setError('')
            setNotice('')
          }}
        >
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Log in'}
        </button>
      </section>
    </main>
  )
}
