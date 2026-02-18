"""
Unit tests for the reference parser
"""
import unittest
from app.models.reference import Reference, ChunkMetadata
from app.services.reference_parser import ReferenceParser


class TestReferenceParser(unittest.TestCase):
    """Test cases for ReferenceParser"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.parser = ReferenceParser()
        
    def test_extract_single_reference(self):
        """Test extracting a single reference"""
        response = "According to [DOC: guide.pdf, PAGE: 5] the process requires validation."
        references = self.parser.extract_references(response)
        
        self.assertEqual(len(references), 1)
        self.assertEqual(references[0].document_name, "guide.pdf")
        self.assertEqual(references[0].page_number, 5)
        self.assertFalse(references[0].validated)
    
    def test_extract_multiple_references(self):
        """Test extracting multiple references"""
        response = """
        The guideline [DOC: EMA_Guidelines.pdf, PAGE: 12] states that...
        Additionally, [DOC: ICH_Q7.pdf, PAGE: 34] requires...
        Finally, [DOC: Internal_SOP.docx, PAGE: 8] specifies...
        """
        references = self.parser.extract_references(response)
        
        self.assertEqual(len(references), 3)
        self.assertEqual(references[0].document_name, "EMA_Guidelines.pdf")
        self.assertEqual(references[0].page_number, 12)
        self.assertEqual(references[1].document_name, "ICH_Q7.pdf")
        self.assertEqual(references[1].page_number, 34)
        self.assertEqual(references[2].document_name, "Internal_SOP.docx")
        self.assertEqual(references[2].page_number, 8)
    
    def test_extract_no_references(self):
        """Test response with no references"""
        response = "This is a response without any citations."
        references = self.parser.extract_references(response)
        
        self.assertEqual(len(references), 0)
    
    def test_extract_with_extra_whitespace(self):
        """Test extraction with various whitespace patterns"""
        response = "[DOC:   document.pdf  ,  PAGE:   42  ]"
        references = self.parser.extract_references(response)
        
        self.assertEqual(len(references), 1)
        self.assertEqual(references[0].document_name, "document.pdf")
        self.assertEqual(references[0].page_number, 42)
    
    def test_extract_case_insensitive(self):
        """Test that pattern matching is case-insensitive"""
        response = "[doc: test.pdf, page: 1] and [DOC: TEST2.pdf, PAGE: 2]"
        references = self.parser.extract_references(response)
        
        self.assertEqual(len(references), 2)
    
    def test_validate_reference_success(self):
        """Test successful reference validation"""
        reference = Reference("test.pdf", 5)
        chunks = [
            ChunkMetadata("chunk1", "test.pdf", 5, "content 1"),
            ChunkMetadata("chunk2", "other.pdf", 10, "content 2")
        ]
        
        result = self.parser.validate_reference(reference, chunks)
        
        self.assertTrue(result)
        self.assertTrue(reference.validated)
        self.assertEqual(reference.chunk_id, "chunk1")
    
    def test_validate_reference_failure(self):
        """Test reference validation when no match found"""
        reference = Reference("missing.pdf", 99)
        chunks = [
            ChunkMetadata("chunk1", "test.pdf", 5, "content 1")
        ]
        
        result = self.parser.validate_reference(reference, chunks)
        
        self.assertFalse(result)
        self.assertFalse(reference.validated)
        self.assertIsNone(reference.chunk_id)
    
    def test_validate_multiple_references(self):
        """Test validating multiple references"""
        references = [
            Reference("doc1.pdf", 1),
            Reference("doc2.pdf", 2),
            Reference("doc3.pdf", 3)
        ]
        chunks = [
            ChunkMetadata("chunk1", "doc1.pdf", 1, "content 1"),
            ChunkMetadata("chunk2", "doc2.pdf", 2, "content 2")
        ]
        
        validated_refs = self.parser.validate_references(references, chunks)
        
        self.assertTrue(validated_refs[0].validated)
        self.assertTrue(validated_refs[1].validated)
        self.assertFalse(validated_refs[2].validated)
    
    def test_parse_and_validate_integrated(self):
        """Test the complete parse and validate flow"""
        response = """
        The process [DOC: SOP_001.pdf, PAGE: 15] requires three steps.
        See also [DOC: Guide.pdf, PAGE: 42] for details.
        """
        chunks = [
            ChunkMetadata("id1", "SOP_001.pdf", 15, "Step 1..."),
            ChunkMetadata("id2", "Guide.pdf", 42, "Details...")
        ]
        
        references = self.parser.parse_and_validate(response, chunks)
        
        self.assertEqual(len(references), 2)
        self.assertTrue(all(ref.validated for ref in references))
        self.assertEqual(references[0].chunk_id, "id1")
        self.assertEqual(references[1].chunk_id, "id2")
    
    def test_parse_without_validation(self):
        """Test parsing without providing chunks for validation"""
        response = "[DOC: test.pdf, PAGE: 1]"
        references = self.parser.parse_and_validate(response)
        
        self.assertEqual(len(references), 1)
        self.assertFalse(references[0].validated)
    
    def test_get_structured_references(self):
        """Test getting references as structured dictionaries"""
        response = "[DOC: doc.pdf, PAGE: 10]"
        chunks = [ChunkMetadata("chunk1", "doc.pdf", 10, "content")]
        
        result = self.parser.get_structured_references(response, chunks)
        
        self.assertEqual(len(result), 1)
        self.assertIsInstance(result[0], dict)
        self.assertEqual(result[0]["document_name"], "doc.pdf")
        self.assertEqual(result[0]["page_number"], 10)
        self.assertEqual(result[0]["chunk_id"], "chunk1")
        self.assertTrue(result[0]["validated"])
    
    def test_complex_document_names(self):
        """Test parsing references with complex document names"""
        response = """
        According to [DOC: IMPD_Guidelines_v2.3_Final.pdf, PAGE: 47]
        and [DOC: Manufacturing-SOP-2024 (Updated).docx, PAGE: 12]
        """
        references = self.parser.extract_references(response)
        
        self.assertEqual(len(references), 2)
        self.assertEqual(references[0].document_name, "IMPD_Guidelines_v2.3_Final.pdf")
        self.assertEqual(references[1].document_name, "Manufacturing-SOP-2024 (Updated).docx")
    
    def test_large_page_numbers(self):
        """Test parsing references with large page numbers"""
        response = "[DOC: long_document.pdf, PAGE: 9999]"
        references = self.parser.extract_references(response)
        
        self.assertEqual(len(references), 1)
        self.assertEqual(references[0].page_number, 9999)
    
    def test_reference_to_dict(self):
        """Test Reference model to_dict method"""
        ref = Reference("test.pdf", 5, "chunk123", True)
        result = ref.to_dict()
        
        self.assertEqual(result["document_name"], "test.pdf")
        self.assertEqual(result["page_number"], 5)
        self.assertEqual(result["chunk_id"], "chunk123")
        self.assertTrue(result["validated"])
    
    def test_chunk_metadata_to_dict(self):
        """Test ChunkMetadata model to_dict method"""
        chunk = ChunkMetadata("chunk1", "doc.pdf", 10, "test content")
        result = chunk.to_dict()
        
        self.assertEqual(result["chunk_id"], "chunk1")
        self.assertEqual(result["document_name"], "doc.pdf")
        self.assertEqual(result["page_number"], 10)
        self.assertEqual(result["content"], "test content")


if __name__ == "__main__":
    unittest.main()
