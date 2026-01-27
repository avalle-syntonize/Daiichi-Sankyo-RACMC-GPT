from fastapi import FastAPI, APIRouter
import uvicorn
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RAG API")

router = APIRouter()

@router.get("/hello")
def hello_world():
    return {"message": "Hello World"}

app.include_router(router, prefix="/api")

if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)