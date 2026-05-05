from pydantic import BaseModel, Field
from claude_agent_sdk import create_sdk_mcp_server, tool

from ..documents import Documents

class GetUserDocumentsArgs(BaseModel):
    user_id: str = Field(description="The ID of the user to fetch documents for (e.g. QTN-1270).")

@tool(
    name="get_user_documents_content",
    description="Fetch all documents content owned by a specific user.",
    input_schema=GetUserDocumentsArgs.model_json_schema(),
)
async def get_user_documents_tool(args: dict) -> dict:
    user_id = args.get("user_id")
    
    if not user_id:
        return {
            "content": [{"type": "text", "text": "user_id is required."}]
        }
        
    pipeline = [
        { "$match": { "owned_by.id": user_id } },
        {
            "$project": {
                "_id": 0,
                "name": 1,
                "fullText": {
                    "$reduce": {
                        "input": "$content.content",
                        "initialValue": "",
                        "in": { "$concat": ["$$value", " ", "$$this"] }
                    }
                }
            }
        }
    ]
    
    docs = await Documents.aggregate(pipeline).to_list()
    
    if not docs:
        return {
            "content": [{"type": "text", "text": f"No documents found for user {user_id}."}]
        }
        
    formatted_docs = []
    for doc in docs:
        name = doc.get("name", "Unknown Document")
        text = doc.get("fullText", "")
        if text:
            text = text.strip()
            formatted_docs.append(f"Document Name: {name}\nContent: {text}")
            
    if not formatted_docs:
        return {
             "content": [{"type": "text", "text": f"Documents found for {user_id}, but they have no text content."}]
        }
            
    final_text = "\n\n---\n\n".join(formatted_docs)
    
    return {
        "content": [{"type": "text", "text": f"Here are the documents for user {user_id}:\n\n{final_text}"}]
    }

drive_documents_mcp = create_sdk_mcp_server(
    name="drive-documents-service",
    tools=[get_user_documents_tool],
)
