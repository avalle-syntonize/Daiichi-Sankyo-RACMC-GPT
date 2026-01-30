from fastapi import FastAPI, APIRouter, Request
import uvicorn
from dotenv import load_dotenv
from typing import Any, Dict, List
from pydantic import BaseModel, Field

load_dotenv()

from core.applications.chatbot_application import ChatbotApplication
from core.adapters.chatbot_adapter import ChatbotAdapter

app = FastAPI(
    title="RACMC- GPT API",
    version="1.0.0",
    description="API for RACMC GPT",
    docs_url="/api/docs",          # Swagger UI
    redoc_url="/api/redoc",        # Redoc
    openapi_url="/api/openapi.json"
)

router = APIRouter()

app_chatbot = ChatbotApplication(ChatbotAdapter())
    
class CompletionsRequest(BaseModel):
    context: Dict[str, Any] = Field(
        ...,
        example={"messages": [{"role": "user", "content": "Hello, what do you know about Daiichi?"}]}
    )

class CompletionsResponse(BaseModel):
    id: str
    model: str
    history_metadata: Dict[str, Any]
    history: List[Any] = []
    content: str

@router.get("/ping")
def ping():
    return {"message": "RACMC GPT API is alive!"}

@router.post(
    "/completions",
    response_model=CompletionsResponse,
    summary="Generates a completion",
    description="Receives `context` (dict) and returns the chatbot's response."
)
async def completions(payload: CompletionsRequest):
    context = payload.context
    response = await app_chatbot.get_completions(context)
    return response


@router.post(
    "/stream/completions",
    # response_model=CompletionsResponse,
    summary="Generates a completion",
    description="Receives `context` (dict) and returns the chatbot's response.",
    responses={
    200: {
        "content": {"application/json-lines": {}},
        "description": "Streaming response in NDJSON format",
        "examples": {
            "example": {
                "summary": "Simulated response",
                "value": '{"id":"abc","choices":[{"messages":[{"role":"assistant","content":"Hello!"}]}]}'
        },
    }
}}
)
async def completions_stream(payload: CompletionsRequest):
    context = payload.context
    response = await app_chatbot.get_completions(context, stream_response=True)
    return response



app.include_router(router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)