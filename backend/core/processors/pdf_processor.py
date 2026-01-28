"""
PDF document processor implementation.

This module provides PDF-specific document processing functionality using
PyPDFLoader from LangChain.
"""

import logging
from typing import List

import core.utils.config as cfg
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader

from .base_processor import BaseDocumentProcessor


class PDFProcessor(BaseDocumentProcessor):
    """
    Processor for PDF documents.

    Extracts text and metadata from PDF files using PyPDFLoader.
    """

    version: str = "1.0.0"

    def supports_format(self, file_extension: str) -> bool:
        """
        Check if this processor supports the given file format.

        Args:
            file_extension (str): File extension (e.g., '.pdf')

        Returns:
            bool: True if extension is .pdf, False otherwise
        """
        return file_extension.lower() == ".pdf"

    def extract(
        self, file_path: str, blob_name: str, blob_url: str, project_id: str
    ) -> List[Document]:
        """
        Extract text and metadata from a PDF document.

        Args:
            file_path (str): Path to the local PDF file
            blob_name (str): Name of the blob in storage
            blob_url (str): URL of the blob
            language (str): Language of the document (e.g., 'english', 'spanish')

        Returns:
            List[Document]: List containing a single Document with all pages combined

        Raises:
            ValueError: If file validation fails
            Exception: If PDF loading or processing fails
        """
        if not self.validate_file(file_path):
            raise ValueError(f"Invalid file: {file_path}")

        # Validate language early before attempting to load the file
        # if language not in cfg.LANGUAGES_CODE:
        #     raise ValueError(
        #         f"Unsupported language: {language}. "
        #         f"Supported languages: {', '.join(cfg.LANGUAGES_CODE.keys())}"
        #     )

        logging.info("Processing PDF: %s", blob_name)

        # Load PDF using PyPDFLoader
        loader = PyPDFLoader(file_path)
        docs = loader.load()

        # Combine all pages into a single text
        text = ""
        language = '' #cfg.LANGUAGES_CODE.get(language, 'unknown')
        language_code = '' #cfg.LANGUAGES_CODE[language]

        # Get base metadata
        metadata = self.get_metadata_base(blob_name, blob_url, language, language_code, project_id)

        # Add PDF-specific metadata from first page
        if docs and docs[0].metadata:
            metadata.update(docs[0].metadata)

        # Combine all page content
        for doc in docs:
            text += doc.page_content
            text += "\n"

        # Add character count
        metadata["char_count"] = len(text)

        # Add page count if available
        if docs:
            metadata["page_count"] = len(docs)

        logging.info(
            "Extracted %d pages from PDF %s (total chars: %d)",
            len(docs),
            blob_name,
            len(text),
        )

        return [
            Document(
                page_content=text,
                metadata=metadata,
            )
        ]