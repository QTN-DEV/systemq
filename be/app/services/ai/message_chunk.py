from typing import Any, Dict, Optional

class ChunkBase:
    def to_json(self) -> Dict[str, Any]:
        return self.__dict__

class TextStartChunk(ChunkBase):
    def __init__(self, message_id: Optional[str] = None):
        self.type = "text_start"
        self.message_id = message_id

class TextDeltaChunk(ChunkBase):
    def __init__(self, text: str, message_id: Optional[str] = None):
        self.type = "text_delta"
        self.text = text
        self.message_id = message_id

class TextEndChunk(ChunkBase):
    def __init__(self, message_id: Optional[str] = None):
        self.type = "text_end"
        self.message_id = message_id

class ThinkingStartChunk(ChunkBase):
    def __init__(self, message_id: Optional[str] = None):
        self.type = "thinking_start"
        self.message_id = message_id

class ThinkingDeltaChunk(ChunkBase):
    def __init__(self, thinking: str, message_id: Optional[str] = None):
        self.type = "thinking_delta"
        self.thinking = thinking
        self.message_id = message_id

class ThinkingStopChunk(ChunkBase):
    def __init__(self, message_id: Optional[str] = None):
        self.type = "thinking_stop"
        self.message_id = message_id

class ToolCallChunk(ChunkBase):
    def __init__(self, tool_name: str, tool_id: str, input_data: Any, message_id: Optional[str] = None):
        self.type = "tool_call"
        self.tool_name = tool_name
        self.tool_id = tool_id
        self.input = input_data
        self.message_id = message_id

class ToolResultChunk(ChunkBase):
    def __init__(self, content: Any, tool_use_id: str, tool_name: Optional[str] = None, message_id: Optional[str] = None):
        self.type = "tool_result"
        self.content = content
        self.tool_use_id = tool_use_id
        self.tool_name = tool_name
        self.message_id = message_id

class CostChunk(ChunkBase):
    def __init__(self, total_cost_usd: float, message_id: Optional[str] = None):
        self.type = "cost"
        self.total_cost_usd = total_cost_usd
        self.message_id = message_id

class FileSavedChunk(ChunkBase):
    def __init__(self, file_path: str, message_id: Optional[str] = None):
        self.type = "file_saved"
        self.file_path = file_path
        self.message_id = message_id
