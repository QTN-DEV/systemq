import os
from fastapi import APIRouter, HTTPException
from typing import List
from anthropic import AsyncAnthropic

from app.core import ResponseEnvelope
from app.submodules.auth import UseAuthContext, allow
from .schemas import AIModelListItem

router = APIRouter(tags=["AI"])

@router.get("/models", response_model=ResponseEnvelope[List[AIModelListItem]], operation_id="getAvailableAiModels")
@allow(["read:all"])
async def get_models(context: UseAuthContext) -> ResponseEnvelope[List[AIModelListItem]]:
    try:
        client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        
        response = await client.models.list()
        
        result = [
            AIModelListItem(id=model.id, name=model.display_name or model.id)
            for model in response.data
            if "claude" in model.id
        ]
        
        return ResponseEnvelope(success=True, result=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")