"""
Document processing orchestrator.

This module implements the Factory pattern to route documents to the appropriate
processor based on file extension, and orchestrates the complete processing workflow.
"""

import logging
import os
from typing import Dict, List

from azure.storage.blob import BlobServiceClient
from langchain_core.documents import Document

from core.processors.docx_processor import DOCXProcessor
from core.processors.pptx_processor import PPTXProcessor
from core.processors.base_processor import BaseDocumentProcessor
from core.processors.pdf_processor import PDFProcessor
import tempfile

class ProcessorOrchestrator:
    """
    Orchestrates document processing by routing files to appropriate processors.

    Uses the Factory pattern to maintain a registry of processors and route
    documents based on their file extension.
    """

    def __init__(self):
        """Initialize the orchestrator and register available processors."""
        self.processors: Dict[str, BaseDocumentProcessor] = {}
        self._register_processors()

    def _register_processors(self) -> None:
        """
        Register all available document processors.

        This method instantiates all processor classes and maps them to the
        file extensions they support.
        """
        # Register PDF processor
     # Register PDF processor
        pdf_processor = PDFProcessor()
        self.processors[".pdf"] = pdf_processor

        # Register docx processor
        docx_processor = DOCXProcessor()
        self.processors[".docx"] = docx_processor

        # Register pptx processor
        pptx_processor = PPTXProcessor()
        self.processors[".pptx"] = pptx_processor
        self.processors[".ppt"] = pptx_processor  # pptx processor can also handle ppt files

        logging.info(
            "Registered processors: %s",
            ", ".join(self.processors.keys()),
        )

    def get_processor(self, file_extension: str) -> BaseDocumentProcessor:
        """
        Get the appropriate processor for a given file extension.

        Args:
            file_extension (str): File extension (e.g., '.pdf', '.docx')

        Returns:
            BaseDocumentProcessor: The processor that handles this format

        Raises:
            ValueError: If no processor supports the given format
        """
        extension = file_extension.lower()

        if extension not in self.processors:
            supported = ", ".join(self.processors.keys())
            raise ValueError(
                f"Unsupported file format: {extension}. Supported formats: {supported}"
            )

        return self.processors[extension]

    def get_supported_formats(self) -> List[str]:
        """
        Get list of supported file formats.

        Returns:
            List[str]: List of supported file extensions
        """
        return list(self.processors.keys())

    def process(
        self,
        blob_name: str,
        source_blob_client: BlobServiceClient,
        blob_url: str,
        project_id: str,
    ) -> List[Document]:
        """
        Process a document through the complete workflow.

        This method:
        1. Detects the file extension
        2. Downloads the file temporarily
        3. Routes to the appropriate processor
        4. Extracts text and metadata
        5. Cleans up temporary files

        Args:
            blob_name (str): Name of the blob to process
            source_blob_client (BlobServiceClient): Client to download the blob
            blob_url (str): URL of the blob
            language (str): Language of the document

        Returns:
            List[Document]: List of Document objects with extracted content

        Raises:
            ValueError: If file format is not supported or file extension cannot be determined
            IOError: If file download fails
            Exception: If document processing or extraction fails
        """
        # Detect file extension
        _, file_extension = os.path.splitext(blob_name)

        if not file_extension:
            raise ValueError(f"Could not determine file extension for: {blob_name}")

        logging.info(
            "Processing document: %s (format: %s, project_id: %s)",
            blob_name,
            file_extension,
            project_id,
        )

        # Get appropriate processor
        processor = self.get_processor(file_extension)
        logging.info("Using processor: %s", processor.__class__.__name__)

        # Create secure temporary file path
        # Use only the filename without path components to prevent path traversal
        safe_filename = os.path.basename(blob_name)
        temp_dir = tempfile.gettempdir()
        temp_file_path = os.path.join(temp_dir, safe_filename)

        try:
            self._download_file(source_blob_client, blob_name, temp_file_path)

            # Extract document content and metadata
            documents = processor.extract(temp_file_path, blob_name, blob_url, project_id)

            logging.info(
                "Successfully processed %s: extracted %d document(s)",
                blob_name,
                len(documents),
            )

            return documents
        except Exception as e:
            logging.error("Error processing document %s: %s", blob_name, e)
        finally:
            # Clean up temporary file
            self._cleanup_temp_file(temp_file_path)

    def _download_file(
        self, source_blob_client: BlobServiceClient, blob_name: str, temp_file_path: str
    ) -> None:
        """
        Download a blob to a temporary file.

        Args:
            source_blob_client (BlobServiceClient): Client to download the blob
            blob_name (str): Name of the blob
            temp_file_path (str): Path where the file will be saved

        Raises:
            Exception: If download fails
        """
        os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)
        logging.info("Downloading blob to: %s", temp_file_path)

        with open(file=temp_file_path, mode="wb") as temp_file:
            download_stream = source_blob_client.download_blob()
            temp_file.write(download_stream.readall())

        logging.info("Blob data saved to: %s", temp_file_path)

    def _cleanup_temp_file(self, file_path: str) -> None:
        """
        Remove temporary file if it exists.

        Args:
            file_path (str): Path to the temporary file
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logging.info("Cleaned up temporary file: %s", file_path)
        except Exception as e:
            logging.warning("Failed to clean up temporary file %s: %s", file_path, e)