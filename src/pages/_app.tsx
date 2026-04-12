import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function App({ Component, pageProps }: AppProps) {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    // Chequear sesión al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Escuchar cambios (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Component 
      {...pageProps} 
      session={session} 
      user={session?.user || null} 
    />
  )
}




