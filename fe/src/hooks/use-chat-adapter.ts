import { type ChatModelAdapter, useLocalRuntime } from '@assistant-ui/react'
import { useMemo } from 'react'
import { parseSSE, mapAssistantStream } from '../utils/map-assistant-stream'

import { config } from '../lib/config'

export function useChatAdapter() {
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

  return useLocalRuntime(adapter)
}
