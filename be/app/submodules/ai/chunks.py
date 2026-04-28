from pydantic import BaseModel, Field, RootModel
from typing import Annotated, Any, Dict, Optional, Union, Literal

class BaseChunk(BaseModel):
    message_id: Optional[str] = None
    
    def to_json(self) -> Dict[str, Any]:
        return self.model_dump()

class TextStartChunk(BaseChunk):
    type: Literal["text_start"] = "text_start"

class TextDeltaChunk(BaseChunk):
    type: Literal["text_delta"] = "text_delta"
    text: str

class TextEndChunk(BaseChunk):
    type: Literal["text_end"] = "text_end"

class ThinkingStartChunk(BaseChunk):
    type: Literal["thinking_start"] = "thinking_start"

class ThinkingDeltaChunk(BaseChunk):
    type: Literal["thinking_delta"] = "thinking_delta"
    thinking: str

class ThinkingStopChunk(BaseChunk):
    type: Literal["thinking_stop"] = "thinking_stop"

class ToolCallChunk(BaseChunk):
    type: Literal["tool_call"] = "tool_call"
    tool_name: str
    tool_id: str
    input: Any

class ToolResultChunk(BaseChunk):
    type: Literal["tool_result"] = "tool_result"
    content: Any
    tool_use_id: str
    tool_name: Optional[str] = None

class CostChunk(BaseChunk):
    type: Literal["cost"] = "cost"
    total_cost_usd: float

class FileSavedChunk(BaseChunk):
    type: Literal["file_saved"] = "file_saved"
    file_path: str


ChunkUnion = Annotated[
    Union[
        TextStartChunk,
        TextDeltaChunk,
        TextEndChunk,
        ThinkingStartChunk,
        ThinkingDeltaChunk,
        ThinkingStopChunk,
        ToolCallChunk,
        ToolResultChunk,
        CostChunk,
        FileSavedChunk
    ],
    Field(discriminator="type")
]

class StreamChunkModel(RootModel):
    root: ChunkUnion