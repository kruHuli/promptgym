import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-bg-base">
        <nav className="border-b border-bg-border bg-bg-surface px-6 py-3 flex items-center gap-6">
          <Link to="/" className="text-accent-primary font-bold text-lg tracking-tight">
            PromptGym
          </Link>
          <span className="text-text-muted text-sm">AI Coding Practice</span>
          <div className="ml-auto flex gap-4">
            <Link to="/" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
              Challenges
            </Link>
            <Link to="/dashboard" className="text-text-secondary hover:text-text-primary text-sm transition-colors">
              Dashboard
            </Link>
          </div>
        </nav>
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
                <Link to="/" className="text-accent-primary hover:underline">Go home</Link>
              </div>
            } />
          </Routes>
        </ErrorBoundary>
      </div>
    </BrowserRouter>
  )
}
