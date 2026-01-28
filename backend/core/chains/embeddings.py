from langchain_core.embeddings import Embeddings
from langchain_openai import AzureOpenAIEmbeddings
import os

def build_embeddings_model() -> Embeddings:
    """Builds and returns an embeddings model using Azure OpenAI service.
    
    Returns:
        Embeddings: An instance of AzureOpenAIEmbeddings initialized with the specified parameters.
    """
    return AzureOpenAIEmbeddings(azure_deployment=os.environ.get("AZURE_OPENAI_EMBEDDING_NAME"), openai_api_version="2024-02-15-preview")