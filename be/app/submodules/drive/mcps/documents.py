from pydantic import BaseModel, Field
from claude_agent_sdk import create_sdk_mcp_server, tool

from ..documents import Documents

class GetUserDocumentsArgs(BaseModel):
    employee_id: str | None = Field(default=None, description="The employee ID of the user to fetch documents for (e.g. QTN-1270). If omitted, returns all documents.")
    query: str | None = Field(default=None, description="Optional regex query to search within document contents.")

@tool(
    name="get_user_documents_content",
    description="Fetch all documents content owned by a specific user.",
    input_schema=GetUserDocumentsArgs.model_json_schema(),
)
async def get_user_documents_tool(args: dict) -> dict:
    employee_id = args.get("employee_id")
    query = args.get("query")
    
    pipeline = []
    if employee_id:
        pipeline.append({ "$match": { "owned_by.id": employee_id } })
        
    pipeline.append({
        "$project": {
            "_id": 0,
            "name": 1,
            "content_html": 1
        }
    })
    
    if query:
        pipeline.append({
            "$match": {
                "$or": [
                    { "content_html": { "$regex": query, "$options": "i" } },
                    { "name": { "$regex": query, "$options": "i" } }
                ]
            }
        })
    
    from app.db.beanie import get_motor_client
    from constants import MONGODB_DATABASE
    
    motor_client = get_motor_client()
    cursor = motor_client[MONGODB_DATABASE].documents.aggregate(pipeline)
    docs = await cursor.to_list(length=None)
    
    if not docs:
        msg = f"No documents found for employee {employee_id}." if employee_id else "No documents found."
        if query:
            msg += f" matching query '{query}'"
        return {
            "content": [{"type": "text", "text": msg}]
        }
        
    formatted_docs = []
    for doc in docs:
        name = doc.get("name", "Unknown Document")
        text = doc.get("content_html", "") or "No HTML content."
        text = text.strip()
        formatted_docs.append(f"Document Name: {name}\nContent: {text}")
            
    if not formatted_docs:
        msg = f"Documents found for {employee_id}, but they have no text content." if employee_id else "Documents found, but they have no text content."
        if query:
            msg += f" matching query '{query}'"
        return {
             "content": [{"type": "text", "text": msg}]
        }
            
    final_text = "\n\n---\n\n".join(formatted_docs)
    
    msg = f"Here are the documents for employee {employee_id}:" if employee_id else "Here are the documents:"
    if query:
        msg += f" matching query '{query}'"
        
    return {
        "content": [{"type": "text", "text": f"{msg}\n\n{final_text}"}]
    }

drive_documents_mcp = create_sdk_mcp_server(
    name="drive-documents-service",
    tools=[get_user_documents_tool],
)
