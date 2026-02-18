"""
Parser for extracting references from LLM responses

Reference format: [DOC: document_name, PAGE: number]
Example: [DOC: IMPD_Guidelines_v2.3.pdf, PAGE: 47]
"""
import re
from typing import List, Optional
from ..models.reference import Reference, ChunkMetadata


class ReferenceParser:
    """
    Parser for extracting and validating references from LLM responses
    
    The LLM is instructed to cite information using the format:
    [DOC: document_name, PAGE: number]
    
    This parser extracts these references and validates them against
    the metadata of document chunks retrieved from AI Search.
    """
    
    # Regex pattern to match references in format [DOC: document_name, PAGE: number]
    REFERENCE_PATTERN = r'\[DOC:\s*([^,]+?)\s*,\s*PAGE:\s*(\d+)\s*\]'
    
    def __init__(self):
        """Initialize the reference parser"""
        self.pattern = re.compile(self.REFERENCE_PATTERN, re.IGNORECASE)
    
    def extract_references(self, llm_response: str) -> List[Reference]:
        """
        Extract all references from LLM response text
        
        Args:
            llm_response: The text response from the LLM
            
        Returns:
            List of Reference objects extracted from the response
            
        Example:
            >>> parser = ReferenceParser()
            >>> response = "According to [DOC: guide.pdf, PAGE: 5] the process..."
            >>> refs = parser.extract_references(response)
            >>> len(refs)
            1
            >>> refs[0].document_name
            'guide.pdf'
            >>> refs[0].page_number
            5
        """
        references = []
        
        for match in self.pattern.finditer(llm_response):
            document_name = match.group(1).strip()
            page_number = int(match.group(2))
            
            reference = Reference(
                document_name=document_name,
                page_number=page_number,
                validated=False
            )
            references.append(reference)
        
        return references
    
    def validate_reference(
        self,
        reference: Reference,
        chunks: List[ChunkMetadata]
    ) -> bool:
        """
        Validate a reference against available chunk metadata
        
        Args:
            reference: The reference to validate
            chunks: List of chunk metadata to validate against
            
        Returns:
            True if the reference matches a chunk, False otherwise
            
        Side effects:
            Updates reference.validated and reference.chunk_id if match found
        """
        for chunk in chunks:
            if (chunk.document_name == reference.document_name and
                chunk.page_number == reference.page_number):
                reference.validated = True
                reference.chunk_id = chunk.chunk_id
                return True
        
        return False
    
    def validate_references(
        self,
        references: List[Reference],
        chunks: List[ChunkMetadata]
    ) -> List[Reference]:
        """
        Validate multiple references against chunk metadata
        
        Args:
            references: List of references to validate
            chunks: List of chunk metadata to validate against
            
        Returns:
            List of references with validation status updated
        """
        for reference in references:
            self.validate_reference(reference, chunks)
        
        return references
    
    def parse_and_validate(
        self,
        llm_response: str,
        chunks: Optional[List[ChunkMetadata]] = None
    ) -> List[Reference]:
        """
        Extract and validate references from LLM response in one step
        
        Args:
            llm_response: The text response from the LLM
            chunks: Optional list of chunk metadata for validation
            
        Returns:
            List of Reference objects, validated if chunks provided
            
        Example:
            >>> parser = ReferenceParser()
            >>> response = "See [DOC: doc.pdf, PAGE: 1]"
            >>> chunks = [ChunkMetadata("id1", "doc.pdf", 1, "content")]
            >>> refs = parser.parse_and_validate(response, chunks)
            >>> refs[0].validated
            True
        """
        references = self.extract_references(llm_response)
        
        if chunks:
            references = self.validate_references(references, chunks)
        
        return references
    
    def get_structured_references(
        self,
        llm_response: str,
        chunks: Optional[List[ChunkMetadata]] = None
    ) -> List[dict]:
        """
        Extract references and return as structured dictionaries
        
        Args:
            llm_response: The text response from the LLM
            chunks: Optional list of chunk metadata for validation
            
        Returns:
            List of dictionaries with reference data
        """
        references = self.parse_and_validate(llm_response, chunks)
        return [ref.to_dict() for ref in references]
