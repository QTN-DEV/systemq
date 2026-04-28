from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

class BaseAIResponseMapper(ABC):
    @abstractmethod
    def map(self, chunk: Any) -> Optional[Dict[str, Any]]:
        pass