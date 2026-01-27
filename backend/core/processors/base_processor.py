"""
Abstract base class for document processors.

This module defines the interface that all document processors must implement
to ensure consistent behavior across different file formats.
"""

import logging
import os
from abc import ABC, abstractmethod
from typing import List

from langchain_core.documents import Document


class BaseDocumentProcessor(ABC):
    """
    Abstract base class for document processors.

    All format-specific processors must inherit from this class and implement
    the abstract methods to handle their specific document format.
    """

    version: str = "1.0.0"

    @abstractmethod
    def supports_format(self, file_extension: str) -> bool:
        """
        Check if this processor supports the given file format.

        Args:
            file_extension (str): File extension (e.g., '.pdf', '.docx')

        Returns:
            bool: True if this processor can handle the format, False otherwise
        """
        pass

    @abstractmethod
    def extract(
        self, file_path: str, blob_name: str, blob_url: str, language: str
    ) -> List[Document]:
        """
        Extract text and metadata from a document.

        Args:
            file_path (str): Path to the local file
            blob_name (str): Name of the blob in storage
            blob_url (str): URL of the blob
            language (str): Language of the document (e.g., 'english', 'spanish')

        Returns:
            List[Document]: List of Document objects with extracted content and metadata
        """
        pass

    def validate_file(self, file_path: str) -> bool:
        """
        Validate that a file exists and is not empty.

        Args:
            file_path (str): Path to the file to validate

        Returns:
            bool: True if file is valid, False otherwise
        """
        if not os.path.exists(file_path):
            logging.error("File does not exist: %s", file_path)
            return False

        if os.path.getsize(file_path) == 0:
            logging.error("File is empty: %s", file_path)
            return False

        return True

    def get_metadata_base(
        self, blob_name: str, blob_url: str, language: str, language_code: str
    ) -> dict:
        """
        Generate standard metadata fields for a document.

        Args:
            blob_name (str): Name of the blob
            blob_url (str): URL of the blob
            language (str): Full language name (e.g., 'english')
            language_code (str): Language code (e.g., 'EN')

        Returns:
            dict: Dictionary with standard metadata fields
        """
        return {
            "filepath": blob_name,
            "url": blob_url,
            "title": blob_name,
            "language": language_code,
            "processor": self.__class__.__name__,
            "processor_version": self.version,
        }