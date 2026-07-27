import { useEffect, useRef, useState, useCallback } from 'react'

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
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (!sessionId) return
    const url = `${WS_BASE}/sessions/${sessionId}/stream`
    const socket = new WebSocket(url)
    ws.current = socket

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
          setSessionStatus(event.data as string)
        }
      } catch {
        // ignore parse errors
      }
    }

    socket.onclose = () => {
      // Auto-reconnect after 2s unless session is done
      reconnectTimer.current = setTimeout(() => {
        if (sessionStatus === 'active') connect()
      }, 2000)
    }

    socket.onerror = () => socket.close()
  }, [sessionId, sessionStatus])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [sessionId])  // only reconnect when sessionId changes

  return { messages, files, sandboxStdout, timerRemaining, sessionStatus }
}
