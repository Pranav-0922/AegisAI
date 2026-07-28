'use client'

import { useState } from 'react'
import { useSessions } from '@/hooks/use-sessions'
import { AppNav, type PrimaryView } from './app-nav'
import { LoginScreen } from './login-screen'
import { DashboardScreen } from './dashboard-screen'
import { ReviewScreen } from './review-screen'
import { ReportScreen } from './report-screen'
import { AnalyticsScreen } from './analytics-screen'

export function AegisApp() {
  const [examiner, setExaminer] = useState<string | null>(null)
  const [primary, setPrimary] = useState<PrimaryView>('dashboard')
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)

  const { sessions, connected, lastTick } = useSessions()

  if (!examiner) {
    return <LoginScreen onSignIn={setExaminer} />
  }

  const reviewSession = sessions.find((s) => s.candidate.id === reviewId) ?? null
  const reportSession = sessions.find((s) => s.candidate.id === reportId) ?? null

  function navigate(view: PrimaryView) {
    setReviewId(null)
    setReportId(null)
    setPrimary(view)
  }

  let screen: React.ReactNode
  if (reportSession) {
    screen = (
      <ReportScreen
        session={reportSession}
        examiner={examiner}
        onBack={() => setReportId(null)}
        onDone={() => {
          setReportId(null)
          setReviewId(null)
        }}
      />
    )
  } else if (reviewSession) {
    screen = (
      <ReviewScreen
        session={reviewSession}
        connected={connected}
        onBack={() => setReviewId(null)}
        onOpenReport={(id) => setReportId(id)}
      />
    )
  } else if (primary === 'analytics') {
    screen = <AnalyticsScreen sessions={sessions} />
  } else {
    screen = (
      <DashboardScreen
        sessions={sessions}
        connected={connected}
        lastTick={lastTick}
        onOpen={(id) => setReviewId(id)}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <AppNav
        active={primary}
        connected={connected}
        examiner={examiner}
        onNavigate={navigate}
        onSignOut={() => {
          setExaminer(null)
          setReviewId(null)
          setReportId(null)
          setPrimary('dashboard')
        }}
      />
      {screen}
    </div>
  )
}
