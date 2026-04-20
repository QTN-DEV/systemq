from typing import AsyncGenerator, Dict, Any, Optional
from abc import ABC, abstractmethod
from pydantic import BaseModel

class PromptRunnerOptions(BaseModel):
    prompt_template: str
    data: Optional[Dict[str, str]] = None

PromptRunnerRunResult = AsyncGenerator[Dict[str, Any], None]

class BasePromptRunner(ABC):
    def __init__(self, options: PromptRunnerOptions):
        self.options = options
        
    @abstractmethod
    def run(self) -> PromptRunnerRunResult:
        pass
