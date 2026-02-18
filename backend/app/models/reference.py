"""
Reference and ChunkMetadata models for LLM citations
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class Reference:
    """
    Represents a reference extracted from LLM response
    
    Format in LLM response: [DOC: document_name, PAGE: number]
    """
    document_name: str
    page_number: int
    chunk_id: Optional[str] = None
    validated: bool = False
    
    def to_dict(self) -> dict:
        """Convert reference to dictionary"""
        return {
            "document_name": self.document_name,
            "page_number": self.page_number,
            "chunk_id": self.chunk_id,
            "validated": self.validated
        }


@dataclass
class ChunkMetadata:
    """
    Represents metadata for a document chunk in AI Search
    """
    chunk_id: str
    document_name: str
    page_number: int
    content: str
    
    def to_dict(self) -> dict:
        """Convert chunk metadata to dictionary"""
        return {
            "chunk_id": self.chunk_id,
            "document_name": self.document_name,
            "page_number": self.page_number,
            "content": self.content
        }
