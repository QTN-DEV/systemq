from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from .message_chunk import (
    TextStartChunk, TextDeltaChunk, TextEndChunk,
    ThinkingStartChunk, ThinkingDeltaChunk, ThinkingStopChunk,
    ToolCallChunk, ToolResultChunk, CostChunk, FileSavedChunk
)

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

    def map(self, chunk: Any) -> Optional[Dict[str, Any]]:
        # Convert chunk to dict
        if hasattr(chunk, "model_dump"):
            chunk_dict = chunk.model_dump()
        elif hasattr(chunk, "dict"):
            chunk_dict = chunk.dict()
        else:
            chunk_dict = chunk if isinstance(chunk, dict) else getattr(chunk, "__dict__", {})
        
        # Identify the chunk by its class name instead of a root "type" key
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

            elif event_type == "content_block_delta":
                delta = event.get("delta", {})
                delta_type = delta.get("type")

                if delta_type == "thinking_delta":
                    return ThinkingDeltaChunk(delta.get("thinking", ""), self.last_message_id).to_json()
                elif delta_type == "text_delta":
                    return TextDeltaChunk(delta.get("text", ""), self.last_message_id).to_json()
                elif delta_type == "signature_delta":
                    return ThinkingStopChunk(self.last_message_id).to_json()

            elif event_type == "content_block_stop":
                # Look up what kind of block is stopping
                cb_type = self.block_types.get(index)
                if cb_type == "text":
                    return TextEndChunk(self.last_message_id).to_json()

        # --- 3. Process Assistant Messages (Tool Calls) ---
        elif class_name == "AssistantMessage":
            content = chunk_dict.get("content", [])
            if content and isinstance(content, list):
                # We look through the blocks to find tool_use
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "tool_use":
                        self.last_tool_name = block.get("name")
                        return ToolCallChunk(
                            tool_name=block.get("name"),
                            tool_id=block.get("id"),
                            input_data=block.get("input"),
                            message_id=self.last_message_id
                        ).to_json()

        # --- 4. Process Results (Costs & Files) ---
        elif class_name == "ResultMessage":
            if chunk_dict.get("total_cost_usd"):
                return CostChunk(chunk_dict.get("total_cost_usd"), self.last_message_id).to_json()
            
            file_path = chunk_dict.get("output_file_path") or chunk_dict.get("path")
            if file_path:
                return FileSavedChunk(file_path, self.last_message_id).to_json()

        return None