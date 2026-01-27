"""
DOCX document processor implementation.

This module provides DOCX-specific document processing functionality using
Docx2txtLoader from LangChain.
"""

import logging
from typing import List

import utils.config as cfg
from langchain_core.documents import Document
from langchain_community.document_loaders import Docx2txtLoader

from .base_processor import BaseDocumentProcessor


class DOCXProcessor(BaseDocumentProcessor):
    """
    Processor for DOCX documents.

    Extracts text and metadata from DOCX files using Docx2txtLoader.
    """

    version: str = "1.0.0"

    def supports_format(self, file_extension: str) -> bool:
        """
        Check if this processor supports the given file format.

        Args:
            file_extension (str): File extension (e.g., '.docx')

        Returns:
            bool: True if extension is .docx, False otherwise
        """
        return file_extension.lower() == ".docx"

    def extract(
        self, file_path: str, blob_name: str, blob_url: str, language: str
    ) -> List[Document]:
        """
        Extract text and metadata from a DOCX document.

        Args:
            file_path (str): Path to the local DOCX file
            blob_name (str): Name of the blob in storage
            blob_url (str): URL of the blob
            language (str): Language of the document (e.g., 'english', 'spanish')

        Returns:
            List[Document]: List containing a single Document with all content combined

        Raises:
            ValueError: If file validation fails or language is not supported
            Exception: If DOCX loading or processing fails
        """
        if not self.validate_file(file_path):
            raise ValueError(f"Invalid file: {file_path}")

        # Validate language early before attempting to load the file
        if language not in cfg.LANGUAGES_CODE:
            raise ValueError(
                f"Unsupported language: {language}. "
                f"Supported languages: {', '.join(cfg.LANGUAGES_CODE.keys())}"
            )

        logging.info("Processing DOCX: %s", blob_name)

        # Load DOCX using Docx2txtLoader
        loader = Docx2txtLoader(file_path)
        docs = loader.load()

        # Combine all documents into a single text
        text = ""
        language_code = cfg.LANGUAGES_CODE[language]

        # Get base metadata
        metadata = self.get_metadata_base(blob_name, blob_url, language, language_code)

        # Add DOCX-specific metadata from first document
        if docs and docs[0].metadata:
            metadata.update(docs[0].metadata)

        # Combine all content
        for doc in docs:
            text += doc.page_content
            text += "\n"

        # Add character count
        metadata["char_count"] = len(text)

        logging.info(
            "Extracted DOCX %s (total chars: %d)",
            blob_name,
            len(text),
        )

        return [
            Document(
                page_content=text,
                metadata=metadata,
            )
        ]