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

    console.log(JSON.stringify(chunk, null, 2))

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
          args: chunk.input || {},
          argsText: JSON.stringify(chunk.input || {}),
        })
        break
      }

      case "tool_call_delta": {
        const lastIndex = currentParts.length - 1
        const lastPart = currentParts[lastIndex]
        if (lastPart?.type === "tool-call" && lastPart.toolCallId === chunk.message_id) {
          // Note: In some SDKs message_id is used for the current active tool call
          // but our mapper currently sends message_id. 
          // We should probably use a more specific ID if available.
        }

        // For now, let's find the last tool-call part and append to its argsText
        const toolPart = [...currentParts].reverse().find(p => p.type === "tool-call");
        if (toolPart) {
          toolPart.argsText = (toolPart.argsText || "") + (chunk.input_delta || "");
          try {
            // Try to parse the accumulated JSON string
            // We strip any trailing comma or incomplete parts if possible, 
            // or just catch the error if it's not valid JSON yet.
            toolPart.args = JSON.parse(toolPart.argsText);
          } catch (e) {
            // If it's partial, we might be able to extract fields with regex
            const contentMatch = toolPart.argsText.match(/"content"\s*:\s*"([^"]*)"/);
            if (contentMatch) {
              toolPart.args = { ...toolPart.args, content: contentMatch[1].replace(/\\n/g, '').replace(/\\"/g, '"') };
            }
          }
        }
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
              toolName: chunk.tool_name || part.toolName,
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
