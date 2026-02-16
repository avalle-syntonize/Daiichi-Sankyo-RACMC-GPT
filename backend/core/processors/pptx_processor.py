"""
PPTX document processor implementation.

This module provides PPTX-specific document processing functionality using
UnstructuredPowerPointLoader from LangChain.
"""

import logging
from typing import List

import utils.config as cfg
from langchain_core.documents import Document
from langchain_community.document_loaders import UnstructuredPowerPointLoader

from .base_processor import BaseDocumentProcessor


class PPTXProcessor(BaseDocumentProcessor):
    """
    Processor for PPTX documents.

    Extracts text and metadata from PPTX files using UnstructuredPowerPointLoader.
    """

    version: str = "1.0.0"

    def supports_format(self, file_extension: str) -> bool:
        """
        Check if this processor supports the given file format.

        Args:
            file_extension (str): File extension (e.g., '.pptx')

        Returns:
            bool: True if extension is .pptx, False otherwise
        """
        return file_extension.lower() == ".pptx"

    def extract(
        self, file_path: str, blob_name: str, blob_url: str, project_id: str
    ) -> List[Document]:
        """
        Extract text and metadata from a PPTX document.

        Args:
            file_path (str): Path to the local PPTX file
            blob_name (str): Name of the blob in storage
            blob_url (str): URL of the blob
            language (str): Language of the document (e.g., 'english', 'spanish')

        Returns:
            List[Document]: List containing a single Document with all content combined

        Raises:
            ValueError: If file validation fails or language is not supported
            Exception: If PPTX loading or processing fails
        """
        if not self.validate_file(file_path):
            raise ValueError(f"Invalid file: {file_path}")


        logging.info("Processing PPTX: %s", blob_name)

        try:
            import nltk
            nltk.download("averaged_perceptron_tagger")
        except Exception:
            logging.debug("NLTK tagger 'averaged_perceptron_tagger' not found; skipping download here.")
        # Load PPTX using UnstructuredPowerPointLoader

        # Load PPTX using UnstructuredPowerPointLoader
        loader = UnstructuredPowerPointLoader(file_path)
        docs = loader.load()

        # Combine all documents into a single text
        text = ""
        language_code = ''
        language = ''

        # Get base metadata
        metadata = self.get_metadata_base(blob_name, blob_url, language, language_code, project_id)

        # Add PPTX-specific metadata from first document
        if docs and docs[0].metadata:
            metadata.update(docs[0].metadata)
            # self.safe_merge_metadata(metadata, docs[0].metadata)

        # Combine all content
        for doc in docs:
            text += doc.page_content
            text += "\n"

        # Add character count
        metadata["char_count"] = len(text)

        logging.info(
            "Extracted PPTX %s (total chars: %d)",
            blob_name,
            len(text),
        )

        return [
            Document(
                page_content=text,
                metadata=metadata,
            )
        ]