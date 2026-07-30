export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const BASE = API_BASE

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
    ...opts,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${text}`)
  }
  return res.json()
}

export interface Challenge {
  id: number
  title: string
  brief_markdown: string
  source: 'generated' | 'authored'
  time_limit_minutes: number
}

export interface Session {
  id: number
  user_id: number
  challenge_id: number
  status: string
  started_at: string
  sandbox_id: string | null
}

export interface Message {
  id: number
  role: 'user' | 'agent' | 'system'
  content: string
  created_at: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

export interface Score {
  id: number
  submission_id: number
  requirements_coverage: number
  functional_correctness: number
  code_quality: number
  product_taste: number
  prompting_skill: number
  overall_numeric: number
  token_cost_total: number
  token_cost_percentile: number
  qualitative_summary: string
  qualitative_breakdown: Record<string, string>
  graded_at: string
}

export interface HistoryItem {
  session_id: number
  challenge_id: number
  challenge_title: string
  status: string
  started_at: string
  submitted_at: string | null
  overall_score: number | null
  token_cost_total: number | null
}

export const api = {
  getUser: (id: number) => req<{ id: number; name: string; created_at: string }>(`/users/${id}`),
  getChallenges: () => req<Challenge[]>('/challenges'),
  getChallenge: (id: number) => req<Challenge>(`/challenges/${id}`),
  generateChallenge: () => req<Challenge>('/challenges/generate', { method: 'POST' }),
  createSession: (challengeId: number, userId = 1) =>
    req<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, user_id: userId }),
    }),
  getSession: (id: number) => req<Session>(`/sessions/${id}`),
  sendMessage: (sessionId: number, content: string) =>
    req<{ status: string }>(`/sessions/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  submitSession: (sessionId: number) =>
    req<{ status: string; submission_id: number }>(`/sessions/${sessionId}/submit`, { method: 'POST' }),
  getScore: (sessionId: number) => req<Score | null>(`/sessions/${sessionId}/score`),
  getMessages: (sessionId: number) => req<Message[]>(`/sessions/${sessionId}/messages`),
  getFiles: (sessionId: number) => req<Record<string, string>>(`/sessions/${sessionId}/files`),
  getUserHistory: (userId: number) => req<HistoryItem[]>(`/users/${userId}/history`),
}
