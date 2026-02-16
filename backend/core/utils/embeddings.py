import logging
import core.utils.config as cfg
from typing import List

from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai.embeddings import AzureOpenAIEmbeddings
from langchain_community.vectorstores.azuresearch import AzureSearch
from langchain_core.documents import Document
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

def semantic_chunk_documents_generic(documents: List[Document]) -> List[Document]:
    """
    Split documents into semantic chunks using OpenAI embeddings.

    This function is format-agnostic and works with any Document objects,
    regardless of their source format (PDF, DOCX, etc.).

    Args:
        documents (List[Document]): List of Document objects to be chunked

    Returns:
        List[Document]: List of Document objects split into semantic chunks

    Environment Variables:
        - AZURE_DEPLOYMENT_EMBEDDING: Azure OpenAI embedding deployment name
        - OPENAI_API_VERSION: OpenAI API version
    """
    logging.info("Chunking %d document(s) using semantic chunker", len(documents))

    text_splitter = SemanticChunker(
        AzureOpenAIEmbeddings(
            azure_deployment=cfg.AZURE_OPENAI_EMBEDDING_NAME,
            openai_api_version=cfg.AZURE_OPENAI_API_VERSION,
        )
    )

    chunks = text_splitter.split_documents(documents)
    logging.info("Created %d chunks from %d document(s)", len(chunks), len(documents))

    return chunks


def load_chunks_azure_search(docs: List[Document], blob_name: str = None) -> None:
    """
    Load chunks into Azure Search index. If a document with the given blob_name exists,
    it will be deleted before loading the new embeddings.

    Parameters:
    docs (List[Document]): A list of Document objects representing the chunks to be added to Azure Search.
    blob_name (str, optional): The name of the blob. If provided, any existing documents with this
                              blob_name will be deleted before loading new embeddings.

    Environment Variables:
    - VectorStoreAddress: The address of the Azure Search vector store.
    - VectorStorePassword: The password for accessing the Azure Search index.

    Returns:
    None
    """

    vector_store_address = cfg.VECTOR_STORE_ADDRESS
    vector_store_password = cfg.VECTOR_STORE_PASSWORD

    embeddings = AzureOpenAIEmbeddings(
        azure_deployment=cfg.AZURE_OPENAI_EMBEDDING_NAME,
        openai_api_version=cfg.AZURE_OPENAI_API_VERSION,
    )
    
    index_name: str = cfg.INDEX_NAME

    logging.info("Load Document chunking document in: %s", index_name)

    logging.info(
        "Content vector save in AZURESEARCH_FIELDS_CONTENT_VECTOR its : %s",
        cfg.AZURESEARCH_FIELDS_CONTENT_VECTOR,
    )

    vector_store = AzureSearch(
        azure_search_endpoint=vector_store_address,
        azure_search_key=vector_store_password,
        index_name=cfg.INDEX_NAME,
        embedding_function=embeddings.embed_query,
        fields=cfg.FIELDS,
    )

    # client = SearchClient(
    #     endpoint=cfg.VECTOR_STORE_ADDRESS,
    #     index_name=cfg.INDEX_NAME,
    #     credential=AzureKeyCredential(cfg.VECTOR_STORE_PASSWORD)
    # )    

    if blob_name:
        logging.info("Checking for existing documents with blob_name: %s", blob_name)
        try:
            filter_str = f"filepath eq '{blob_name}'"
            vector_store.delete(filter=filter_str)
            logging.info("Deleted existing documents with blob_name: %s", blob_name)
        except Exception as e:
            logging.warning(
                "Error deleting documents with blob_name %s: %s", blob_name, str(e)
            )

    # total = 0
    # while True:
    #     results = client.search("*", top=1000, select=["id"])
    #     docs = [{"id": r["id"]} for r in results]
    #     if not docs:    
    #         break
    #     client.delete_documents(documents=docs)
    #     total += len(docs)
    #     print(f"Eliminados {len(docs)} documentos (total: {total})")


    vector_store.add_documents(documents=docs)