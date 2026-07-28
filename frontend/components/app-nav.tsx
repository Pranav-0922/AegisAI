'use client'

import { cn } from '@/lib/utils'
import { Logo } from './logo'
import { Radio, LayoutGrid, LogOut } from 'lucide-react'

export type PrimaryView = 'dashboard' | 'analytics'

export function AppNav({
  active,
  connected,
  examiner,
  onNavigate,
  onSignOut,
}: {
  active: PrimaryView
  connected: boolean
  examiner: string
  onNavigate: (view: PrimaryView) => void
  onSignOut: () => void
}) {
  const items: { key: PrimaryView; label: string; icon: typeof Radio }[] = [
    { key: 'dashboard', label: 'Live Monitoring', icon: Radio },
    { key: 'analytics', label: 'Analytics', icon: LayoutGrid },
  ]

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          aria-label="AegisAI home"
        >
          <Logo />
        </button>

        <nav className="flex items-center gap-1" aria-label="Primary">
          {items.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={active === key ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-2 rounded-sm px-3 py-1.5 font-sans text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                active === key
                  ? 'bg-ink text-primary-foreground'
                  : 'text-pencil hover:bg-accent hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <span
            className="hidden items-center gap-2 font-sans text-xs text-pencil md:inline-flex"
            title={connected ? 'Live feed connected' : 'Connecting to live feed'}
          >
            <span className="relative flex h-2 w-2">
              {connected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-verified opacity-60" />
              )}
              <span
                className={cn(
                  'relative inline-flex h-2 w-2 rounded-full',
                  connected ? 'bg-verified' : 'bg-pencil',
                )}
              />
            </span>
            {connected ? 'Live' : 'Connecting…'}
          </span>

          <span className="hidden font-sans text-sm text-ink sm:inline">
            {examiner}
          </span>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1.5 font-sans text-sm text-pencil transition-colors hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
