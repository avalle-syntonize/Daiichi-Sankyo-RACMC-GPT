from fastapi import FastAPI, APIRouter, Request
import uvicorn
from dotenv import load_dotenv
from typing import Any, Dict, List
from pydantic import BaseModel, Field

load_dotenv()

from core.applications.chatbot_application import ChatbotApplication
from core.adapters.chatbot_adapter import ChatbotAdapter

app = FastAPI(
    title="RAG API",
    version="0.1.0",
    description="API para RAG + chat completions",
    docs_url="/docs",          # Swagger UI
    redoc_url="/redoc",        # Redoc
    openapi_url="/openapi.json"
)

router = APIRouter()

app_chatbot = ChatbotApplication(ChatbotAdapter())

class CompletionsRequest(BaseModel):
    context: Dict[str, Any] = Field(
        ...,
        example={"messages": [{"role": "user", "content": "Hola, ¿qué dice la guía sobre X?"}]}
    )

class CompletionsResponse(BaseModel):
    id: str
    model: str
    history_metadata: Dict[str, Any]
    history: List[Any] = []
    content: str

@router.get("/ping")
def hello_world():
    return {"message": "RACMC GPT API is alive!"}

@router.post(
    "/completions",
    response_model=CompletionsResponse,
    summary="Genera una completion",
    description="Recibe `context` (dict) y devuelve la respuesta del chatbot."
)
async def completions(payload: CompletionsRequest):
    context = payload.context
    response = await app_chatbot.get_completions(context)
    return response


@router.post(
    "/stream/completions",
    # response_model=CompletionsResponse,
    summary="Genera una completion",
    description="Recibe `context` (dict) y devuelve la respuesta del chatbot.",
    responses={
    200: {
        "content": {"application/json-lines": {}},
        "description": "Respuesta en streaming NDJSON",
        "examples": {
            "ejemplo": {
                "summary": "Respuesta simulada",
                "value": '{"id":"abc","choices":[{"messages":[{"role":"assistant","content":"Hola!"}]}]}'
            }
        },
    }
},
)
async def completions_stream(payload: CompletionsRequest):
    context = payload.context
    response = await app_chatbot.get_completions(context, stream_response=True)
    return response



app.include_router(router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)