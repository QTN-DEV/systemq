from pydantic import BaseModel

class AIModelListItem(BaseModel):
    id: str
    name: str