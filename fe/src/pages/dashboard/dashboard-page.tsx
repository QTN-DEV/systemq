import { type ReactElement } from 'react'
import { WorkspaceAssistantThread } from '../../components/chat/workspace-assistant-thread'
import { useChatAdapter } from '../../hooks/use-chat-adapter'

function Dashboard(): ReactElement {
  const runtime = useChatAdapter()

  return (
    <WorkspaceAssistantThread runtime={runtime} />
  )
}

export default Dashboard
