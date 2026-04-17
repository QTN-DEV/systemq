export async function* parseSSE(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          yield JSON.parse(data);
        } catch (e) { }
      }
    }
  }
}

export async function* mapAssistantStream(stream: AsyncIterable<any>) {
  let currentParts: any[] = []

  for await (const chunk of stream) {
    const { type } = chunk

    switch (type) {
      case "text_delta": {
        const content = chunk.text
        const lastIndex = currentParts.length - 1
        const lastPart = currentParts[lastIndex]
        if (lastPart?.type === "text") {
          currentParts[lastIndex] = { ...lastPart, text: lastPart.text + (content || "") }
        } else {
          currentParts.push({ type: "text", text: content || "" })
        }
        break
      }

      case "thinking_delta": {
        const content = chunk.thinking
        const lastIndex = currentParts.length - 1
        const lastPart = currentParts[lastIndex]
        if (lastPart?.type === "reasoning") {
          currentParts[lastIndex] = { ...lastPart, text: lastPart.text + (content || "") }
        } else {
          currentParts.push({ type: "reasoning", text: content || "" })
        }
        break
      }

      case "cost": {
        currentParts.push({
          type: "cost",
          amount: chunk.total_cost_usd || 0,
        })
        break
      }

      case "tool_call": {
        currentParts.push({
          type: "tool-call",
          toolCallId: chunk.tool_id,
          toolName: chunk.tool_name,
          args: chunk.input,
          argsText: JSON.stringify(chunk.input),
        })
        break
      }

      case "tool_result": {
        currentParts = currentParts.map((part) => {
          if (
            part.type === "tool-call" &&
            part.toolCallId === chunk.tool_use_id
          ) {
            return {
              ...part,
              result: chunk.content,
            }
          }
          return part
        })
        break
      }
    }

    yield {
      content: [...currentParts],
    }
  }
}
