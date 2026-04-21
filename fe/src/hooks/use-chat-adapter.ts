import { type ChatModelAdapter, useLocalRuntime } from '@assistant-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { parseSSE, mapAssistantStream } from '../utils/map-assistant-stream'

import { config } from '../lib/config'

const STORAGE_KEY = 'chat_messages'

export function useChatAdapter() {
  const [initialMessages] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return []
      const parsed = JSON.parse(saved)
      return parsed.map((msg: any) => ({
        ...msg,
        content: msg.content.filter((part: any) => part.type !== 'cost')
      }))
    } catch (e) {
      console.error('Failed to parse local storage messages', e)
      return []
    }
  })

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async *run({ messages, abortSignal }) {
        const response = await fetch(`${config.apiBaseUrl}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content.map((c) => (c.type === 'text' ? c.text : '')).join(''),
            })),
          }),
          signal: abortSignal,
        })

        yield* mapAssistantStream(parseSSE(response))
      },
    }),
    []
  )

  const runtime = useLocalRuntime(adapter, { initialMessages })

  useEffect(() => {
    if (!runtime) return

    const unsubscribe = runtime.thread.subscribe(() => {
      const currentMessages = runtime.thread.getState().messages
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentMessages))
    })

    return unsubscribe
  }, [runtime])

  return runtime
}
