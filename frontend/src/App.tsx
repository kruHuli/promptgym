import React from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Lobby from './pages/Lobby'
import ChallengeBrief from './pages/ChallengeBrief'
import LiveBuild from './pages/LiveBuild'
import Results from './pages/Results'
import Dashboard from './pages/Dashboard'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-accent-danger mb-2">Something went wrong</div>
          <div className="text-xs font-mono text-text-muted">{this.state.error}</div>
          <button className="btn-ghost mt-4" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      </div>
    )
    return this.props.children
  }
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-mono transition-colors px-1 pb-0.5 ${
    isActive
      ? 'text-accent-primary border-b border-accent-primary'
      : 'text-text-muted hover:text-text-secondary'
  }`

function AppShell() {
  const location = useLocation()
  // Hide global nav inside the arena (LiveBuild has its own header)
  const isArena = /^\/sessions\/\d+$/.test(location.pathname)

  return (
    <div className="min-h-screen bg-bg-base">
      {!isArena && (
        <nav className="border-b border-bg-border bg-bg-surface/80 backdrop-blur-sm px-6 h-12 flex items-center gap-6 sticky top-0 z-50">
          <NavLink to="/" className="flex items-center gap-0 font-mono font-bold text-base tracking-widest select-none">
            <span className="text-accent-primary text-glow-purple">PROMPT</span>
            <span className="text-accent-cyan text-glow-cyan">_GYM</span>
          </NavLink>
          <div className="h-4 w-px bg-bg-border" />
          <div className="flex items-center gap-5">
            <NavLink to="/" end className={navLinkClass}>challenges</NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>dashboard</NavLink>
          </div>
        </nav>
      )}
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/challenges/:id" element={<ChallengeBrief />} />
          <Route path="/sessions/:id" element={<LiveBuild />} />
          <Route path="/sessions/:id/results" element={<Results />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={
            <div className="text-text-muted text-center py-20">
              404 — Page not found.{' '}
              <NavLink to="/" className="text-accent-primary hover:underline">Go home</NavLink>
            </div>
          } />
        </Routes>
      </ErrorBoundary>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
