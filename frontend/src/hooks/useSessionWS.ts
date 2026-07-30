import { useEffect, useRef, useState, useCallback } from 'react'
import { api } from '../api/client'

const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace(/^http/, 'ws')

export interface WSMessage {
  id?: number
  role: 'user' | 'agent' | 'system'
  content: string
  tokens?: { input: number; output: number }
  cost_usd?: number
}

export interface FileDiff {
  path: string
  content: string
}

export function useSessionWS(sessionId: number | null) {
  const [messages, setMessages] = useState<WSMessage[]>([])
  const [files, setFiles] = useState<Record<string, string>>({})
  const [sandboxStdout, setSandboxStdout] = useState<string[]>([])
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null)
  const [sessionStatus, setSessionStatus] = useState<string>('active')
  const [wsStatus, setWsStatus] = useState<'connecting' | 'open' | 'closed'>('connecting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // ref so the onclose closure always reads the current status without going stale
  const sessionStatusRef = useRef('active')

  const connect = useCallback(() => {
    if (!sessionId) return
    // StrictMode runs effects twice — skip if a socket is already open/connecting
    if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) return
    setWsStatus('connecting')
    const socket = new WebSocket(`${WS_BASE}/sessions/${sessionId}/stream`)
    ws.current = socket

    socket.onopen = () => setWsStatus('open')

    socket.onmessage = (evt) => {
      try {
        const event = JSON.parse(evt.data)
        if (event.type === 'message') {
          setMessages((prev) => [...prev, event.data as WSMessage])
        } else if (event.type === 'file_diff') {
          const diff = event.data as FileDiff
          setFiles((prev) => ({ ...prev, [diff.path]: diff.content }))
        } else if (event.type === 'sandbox_stdout') {
          setSandboxStdout((prev) => [...prev, event.data as string])
        } else if (event.type === 'timer') {
          setTimerRemaining((event.data as { remaining_seconds: number }).remaining_seconds)
        } else if (event.type === 'status') {
          sessionStatusRef.current = event.data as string
          setSessionStatus(event.data as string)
        } else if (event.type === 'error') {
          setErrorMsg(event.data as string)
        }
      } catch (e) {
        console.warn('WS parse error', evt.data, e)
      }
    }

    socket.onclose = () => {
      setWsStatus('closed')
      reconnectTimer.current = setTimeout(() => {
        if (sessionStatusRef.current === 'active') connect()
      }, 2000)
    }

    socket.onerror = () => socket.close()
  }, [sessionId])

  useEffect(() => {
    // Seed history so the transcript survives page reloads; WS only streams new events
    if (sessionId) {
      api.getMessages(sessionId).then((history) => {
        const seeded: WSMessage[] = history.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          tokens: { input: m.input_tokens ?? 0, output: m.output_tokens ?? 0 },
          cost_usd: m.cost_usd,
        }))
        // keep any WS messages that raced in before the fetch resolved
        setMessages((prev) => [...seeded, ...prev.filter((p) => !seeded.some((s) => s.id === p.id))])
      })
    }
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [sessionId])

  return { messages, files, sandboxStdout, timerRemaining, sessionStatus, wsStatus, errorMsg }
}
