from abc import ABC, abstractmethod
from core.domain.models.main import ChatMessage
from langchain_openai import AzureOpenAIEmbeddings
from typing import Any, Dict, List
from langchain_chroma import Chroma  

class ChatbotRepository(ABC):

    @abstractmethod
    async def get_completions(self, context: Dict[str, Any]) -> str:
        pass

    @abstractmethod
    def create_vector_store(self, embeddings: AzureOpenAIEmbeddings,  collection_name: str = "example_collection") -> None:
        pass    
    
    @abstractmethod
    def create_embeddings(self, model: str) -> AzureOpenAIEmbeddings: 
        pass

    @abstractmethod
    async def process_file_into_document_chunks(self, binary_data, mime_type):
        pass

    @abstractmethod
    async def add_documents_to_store(self, vector_store: Chroma, documents: List[str]) -> None:  
        pass