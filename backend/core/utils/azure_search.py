from langchain_community.vectorstores.azuresearch import AzureSearch
from langchain_core.embeddings import Embeddings
from langchain_core.vectorstores import VectorStore
import os
from core.utils.consts import fields
from core.utils.client import AsyncAzureSearch

def build_azure_search_store(embeddings: Embeddings) -> VectorStore:
    """Builds an Azure Search store using the provided embeddings.
    
        Args:
            embeddings (Embeddings): The embeddings to be used for building the Azure Search store.
    
        Returns:
            VectorStore: An AzureSearch object representing the Azure Search store.
    """
    return AzureSearch(
        azure_search_endpoint=f"https://{os.environ.get('AZURE_SEARCH_SERVICE')}.search.windows.net",
        azure_search_key=os.environ.get("AZURE_SEARCH_KEY"),
        index_name=os.environ.get("AZURE_SEARCH_INDEX"),
        embedding_function=embeddings.embed_query,
        fields=fields,
    )

def build_azure_search_store_async(embeddings: Embeddings) -> VectorStore:
    """Builds an Azure Search store using the provided embeddings.
    
        Args:
            embeddings (Embeddings): The embeddings to be used for building the Azure Search store.
    
        Returns:
            VectorStore: An AzureSearch object representing the Azure Search store.
    """
    return AsyncAzureSearch(
        azure_search_endpoint=f"https://{os.environ.get('AZURE_SEARCH_SERVICE')}.search.windows.net",
        azure_search_key=os.environ.get("AZURE_SEARCH_KEY"),
        index_name=os.environ.get("AZURE_SEARCH_INDEX"),
        embedding_function=embeddings.embed_query,
        fields=fields,
    )