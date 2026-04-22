from abc import ABC, abstractmethod
import logging
from typing import Any, Dict, Optional
from .message_chunk import (
    TextStartChunk, TextDeltaChunk, TextEndChunk,
    ThinkingStartChunk, ThinkingDeltaChunk, ThinkingStopChunk,
    ToolCallChunk, ToolResultChunk, CostChunk, FileSavedChunk
)

logger = logging.getLogger(__name__)
class AIResponseMapper(ABC):
    @abstractmethod
    def map(self, chunk: Any) -> Optional[Dict[str, Any]]:
        pass

class AnthropicMapper(AIResponseMapper):
    def __init__(self):
        self.last_message_id: Optional[str] = None
        self.last_tool_name: Optional[str] = None
        # Track block types by index to know what is ending on content_block_stop
        self.block_types: Dict[int, str] = {} 

    def _flatten_content(self, content: Any) -> str:
        if isinstance(content, str):
            return content.replace("\n", "")
        if isinstance(content, list):
            texts = []
            for item in content:
                if isinstance(item, dict):
                    if item.get("type") == "text":
                        texts.append(item.get("text", "").replace("\n", ""))
                    elif item.get("type") == "tool_reference":
                        texts.append(f"Tool Reference: {item.get('tool_name')}")
                else:
                    texts.append(str(item).replace("\n", ""))
            return "".join(texts)
        return str(content).replace("\n", "")
    def map(self, chunk: Any) -> Optional[Dict[str, Any]]:
        if hasattr(chunk, "model_dump"):
            chunk_dict = chunk.model_dump(mode="json")
        elif hasattr(chunk, "dict"):
            chunk_dict = chunk.dict()
        else:
            chunk_dict = chunk if isinstance(chunk, dict) else getattr(chunk, "__dict__", {})
        
        class_name = type(chunk).__name__
        event = chunk_dict.get("event", {})
        message = chunk_dict.get("message", {})

        # --- 1. Extract Message ID ---
        if class_name == "StreamEvent" and isinstance(event, dict):
            msg = event.get("message", {})
            if isinstance(msg, dict) and "id" in msg:
                self.last_message_id = msg["id"]
        elif isinstance(message, dict) and "id" in message:
             self.last_message_id = message["id"]
        elif chunk_dict.get("message_id"):
             self.last_message_id = chunk_dict["message_id"]

        # --- 2. Process Stream Events ---
        if class_name == "StreamEvent" and isinstance(event, dict):
            event_type = event.get("type")
            index = event.get("index")

            if event_type == "content_block_start":
                cb = event.get("content_block", {})
                cb_type = cb.get("type")
                
                # Store the block type by index so we remember it on 'stop'
                if index is not None:
                    self.block_types[index] = cb_type

                if cb_type == "text":
                    return TextStartChunk(self.last_message_id).to_json()
                elif cb_type == "thinking":
                    return ThinkingStartChunk(self.last_message_id).to_json()
                elif cb_type == "tool_use":
                    tool_name = cb.get("name", "")
                    self.last_tool_name = tool_name
                    return ToolCallChunk(
                        tool_name=tool_name,
                        tool_id=cb.get("id", ""),
                        input_data={},
                        message_id=self.last_message_id
                    ).to_json()

            elif event_type == "content_block_delta":
                delta = event.get("delta", {})
                delta_type = delta.get("type")

                if delta_type == "thinking_delta":
                    thinking = delta.get("thinking", "").replace("\n", "")
                    return ThinkingDeltaChunk(thinking, self.last_message_id).to_json()
                elif delta_type == "text_delta":
                    text = delta.get("text", "").replace("\n", "")
                    return TextDeltaChunk(text, self.last_message_id).to_json()
                elif delta_type == "signature_delta":
                    return ThinkingStopChunk(self.last_message_id).to_json()

            elif event_type == "content_block_stop":
                cb_type = self.block_types.get(index)
                if cb_type == "text":
                    return TextEndChunk(self.last_message_id).to_json()

        elif class_name == "AssistantMessage" or class_name == "Message":
            # chunk_dict["content"] may contain dicts OR Python repr strings like
            # "ToolUseBlock(id='...', ...)" when model_dump serialises nested SDK objects
            # as their __repr__. Fall back to the original chunk's .content attribute so
            # each block can be serialised individually via its own model_dump.
            raw_blocks = getattr(chunk, "content", None) or chunk_dict.get("content", [])
            if raw_blocks and isinstance(raw_blocks, list):
                for block in raw_blocks:
                    # Normalise block to a plain dict
                    if isinstance(block, dict):
                        block_dict = block
                    elif hasattr(block, "model_dump"):
                        block_dict = block.model_dump(mode="json")
                    elif hasattr(block, "dict"):
                        block_dict = block.dict()
                    elif hasattr(block, "__dict__"):
                        block_dict = block.__dict__
                    else:
                        continue

                    if block_dict.get("type") == "tool_use":
                        input_data = block_dict.get("input")
                        if isinstance(input_data, dict) and "content" in input_data:
                            input_data["content"] = input_data["content"].replace("\n", "")

                        return ToolCallChunk(
                            tool_name=block_dict.get("name"),
                            tool_id=block_dict.get("id"),
                            input_data=input_data,
                            message_id=self.last_message_id
                        ).to_json()

        # --- 4. Process Results (Costs & Files) ---
        elif class_name in ("ResultMessage", "ToolResultMessage", "UserMessage"):
            if chunk_dict.get("total_cost_usd"):
                return CostChunk(chunk_dict.get("total_cost_usd"), self.last_message_id).to_json()
            
            # 4a. Handle standard tool results (ToolResultMessage)
            if class_name == "ToolResultMessage" or "tool_use_id" in chunk_dict:
                tool_name = chunk_dict.get("tool_name") or self.last_tool_name
                logger.info(f"Detected tool result for {tool_name}")
                return ToolResultChunk(
                    content=self._flatten_content(chunk_dict.get("content")),
                    tool_use_id=chunk_dict.get("tool_use_id"),
                    tool_name=tool_name,
                    message_id=self.last_message_id
                ).to_json()

            # 4b. Handle tool results hidden in UserMessage (from raw logs)
            if class_name == "UserMessage" and chunk_dict.get("tool_use_result"):
                content_str = str(chunk_dict.get("content", [""]))
                import re
                
                # Extract tool_use_id
                id_match = re.search(r"tool_use_id='([^']+)'", content_str)
                tool_use_id = id_match.group(1) if id_match else "unknown"

                # Extract tool_name if possible
                name_match = re.search(r"tool_name='([^']+)'", content_str)
                tool_name = name_match.group(1) if name_match else self.last_tool_name
                
                # Use tool_use_result directly — it's already structured [{type, text}],
                # so avoid the fragile string-repr regex that breaks on escaped quotes.
                extracted_content = self._flatten_content(chunk_dict.get("tool_use_result"))
                
                return ToolResultChunk(
                    content=extracted_content,
                    tool_use_id=tool_use_id,
                    tool_name=tool_name,
                    message_id=self.last_message_id
                ).to_json()

            # Handle file saved logic
            file_path = chunk_dict.get("output_file_path") or chunk_dict.get("path")
            if file_path:
                return FileSavedChunk(file_path, self.last_message_id).to_json()

        # Debug: return the raw info if it's something we don't recognize yet
        return {"type": "unknown", "class": class_name, "data": str(chunk_dict)}