import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { AuthScreen } from './components/AuthScreen.tsx'
import { Dashboard } from './components/Dashboard.tsx'
import { supabase } from './lib/supabase.ts'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setUser(data.session?.user ?? null)
      setReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setReady(true)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-serif text-3xl">Tethr</p>
      </main>
    )
  }

  if (!user) return <AuthScreen />
  return <Dashboard user={user} />
}
