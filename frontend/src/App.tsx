import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Lobby from './pages/Lobby'
import ChallengeBrief from './pages/ChallengeBrief'
import LiveBuild from './pages/LiveBuild'
import Results from './pages/Results'
import Dashboard from './pages/Dashboard'

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
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/challenges/:id" element={<ChallengeBrief />} />
          <Route path="/sessions/:id" element={<LiveBuild />} />
          <Route path="/sessions/:id/results" element={<Results />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
