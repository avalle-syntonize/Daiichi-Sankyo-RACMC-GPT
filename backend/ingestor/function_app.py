import logging
import os
import azure.functions as func
from datetime import datetime

from azure.storage.blob import BlobServiceClient
from core.applications.ingestor_application import IngestorApplication
from core.adapters.ingestor_adapter import IngestorAdapter
# from orchestrator import ProcessorOrchestrator
from core.utils.embeddings import semantic_chunk_documents_generic, load_chunks_azure_search
from core.utils.embeddings import move_file_to_completed, move_file_to_failed, rename_file

app = func.FunctionApp()


@app.blob_trigger(
    arg_name="myblob",
    path="documents/input/{folder}/{name}",
    connection="BlobStorageConnectionString",
)
def main(myblob: func.InputStream):
    """
    Waits for a new blob to be uploaded to a container and triggers the azure function.
    """
    logging.info(
        "Python blob trigger function processed blob\n"
        "Name: %s \n"
        "Blob Size:  %s bytes\n"
        "Blob:  %s",
        myblob.name,
        myblob.length,
        myblob.uri,
    )

    connection_string = os.environ["BlobStorageConnectionString"]
    blob_service_client = BlobServiceClient.from_connection_string(connection_string)

    blob_name = myblob.name.split("/")[-1]
    language = myblob.name.split("/")[-2]

    container_name = "documents"
    source_container_name = f"input/{language}"
    current_date = datetime.now()
    formatted_date = current_date.strftime("%Y%m%d")
    new_blob_name = rename_file(
        blob_service_client,
        container_name,
        source_container_name,
        blob_name,
        myblob,
        formatted_date,
        language,
    )

    source_blob_client = blob_service_client.get_blob_client(
        container=container_name, blob=f"inprogress/{new_blob_name}"
    )

    url_inprogress = source_blob_client.url
    blob_completed = url_inprogress.replace(
        "inprogress", f"completed/{language}/{formatted_date}"
    )

    try:
        # Initialize orchestrator
        # orchestrator = ProcessorOrchestrator()
        orchestrator = IngestorApplication(IngestorAdapter())
        # Process document using orchestrator
        documents = orchestrator.process(
            new_blob_name, source_blob_client, blob_completed, language
        )

        # Chunk documents using generic chunker
        chunks = semantic_chunk_documents_generic(documents)

        # Load chunks to Azure Search
        load_chunks_azure_search(chunks, blob_name=new_blob_name)

        # Move file to completed folder
        move_file_to_completed(
            blob_service_client,
            myblob,
            new_blob_name,
            url_inprogress,
            source_container_name,
            source_blob_client,
            formatted_date,
            language,
        )
    except Exception as e:
        logging.error("Failed doc from blob %s to azure search: %s", new_blob_name, e)
        move_file_to_failed(
            blob_service_client,
            myblob,
            source_container_name,
            source_blob_client,
            formatted_date,
            language,
            new_blob_name,
        )
        raise e