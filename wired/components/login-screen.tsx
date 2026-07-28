'use client'

import { useState } from 'react'
import { Logo } from './logo'
import { ArrowRight } from 'lucide-react'

export function LoginScreen({ onSignIn }: { onSignIn: (name: string) => void }) {
  const [email, setEmail] = useState('e.hartwell@meridian.edu')
  const [password, setPassword] = useState('demo-password')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const name = email.includes('@')
      ? 'Dr. E. Hartwell'
      : 'Examiner'
    onSignIn(name)
  }

  return (
    <main className="flex min-h-screen flex-col bg-paper">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-start gap-4">
            <Logo />
            <div>
              <h1 className="text-balance font-serif text-2xl font-semibold leading-tight text-ink">
                Examiner review console
              </h1>
              <p className="mt-2 text-pretty font-sans text-sm leading-relaxed text-pencil">
                Language itself is the evidence. Sign in to review flagged exam
                sessions for your institution.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-md border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-sm font-medium text-ink">
                  Institution email
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  className="rounded-sm border border-input bg-paper px-3 py-2 font-sans text-sm text-ink outline-none placeholder:text-pencil/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card"
                  placeholder="you@institution.edu"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-sm font-medium text-ink">
                  Password
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="rounded-sm border border-input bg-paper px-3 py-2 font-sans text-sm text-ink outline-none placeholder:text-pencil/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card"
                  placeholder="••••••••"
                />
              </label>

              <button
                type="submit"
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-sm bg-ink px-4 py-2.5 font-sans text-sm font-medium text-primary-foreground transition-colors hover:bg-ink/90 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                Sign in to console
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>

          <p className="mt-6 text-center font-sans text-xs leading-relaxed text-pencil">
            Meridian University · Academic Integrity Office
          </p>
        </div>
      </div>

      <footer className="border-t border-border px-6 py-4">
        <p className="mx-auto max-w-sm text-center font-sans text-xs text-pencil/80">
          AegisAI reviews typed and transcribed language only. It does not use
          webcams or biometric surveillance.
        </p>
      </footer>
    </main>
  )
}
