#!/usr/bin/env python3
"""
Example demonstrating the ReferenceParser usage

This script shows how to extract and validate references from LLM responses.
"""
from app.models.reference import Reference, ChunkMetadata
from app.services.reference_parser import ReferenceParser


def main():
    print("="*70)
    print("RACMC-GPT Reference Parser - Example Usage")
    print("="*70)
    print()
    
    # Initialize parser
    parser = ReferenceParser()
    
    # Example 1: Simple extraction
    print("Example 1: Extract references from LLM response")
    print("-" * 70)
    
    llm_response_1 = """
    According to the validation protocol [DOC: IMPD_Guidelines_v2.3.pdf, PAGE: 47],
    the manufacturing process must include detailed descriptions of critical
    process parameters and acceptance criteria.
    """
    
    print("LLM Response:")
    print(llm_response_1)
    print()
    
    references = parser.extract_references(llm_response_1)
    print(f"Extracted {len(references)} reference(s):")
    for i, ref in enumerate(references, 1):
        print(f"  {i}. Document: {ref.document_name}")
        print(f"     Page: {ref.page_number}")
        print(f"     Validated: {ref.validated}")
    print()
    
    # Example 2: Multiple references
    print("Example 2: Extract multiple references")
    print("-" * 70)
    
    llm_response_2 = """
    The process validation requires [DOC: EMA_Guidelines.pdf, PAGE: 12] at least
    three consecutive batches. Each batch must follow [DOC: ICH_Q7.pdf, PAGE: 34]
    with complete documentation as specified in [DOC: Internal_SOP.docx, PAGE: 8].
    """
    
    print("LLM Response:")
    print(llm_response_2)
    print()
    
    references = parser.extract_references(llm_response_2)
    print(f"Extracted {len(references)} reference(s):")
    for i, ref in enumerate(references, 1):
        print(f"  {i}. [{ref.document_name}, Page {ref.page_number}]")
    print()
    
    # Example 3: Validation against chunks
    print("Example 3: Validate references against chunk metadata")
    print("-" * 70)
    
    llm_response_3 = """
    Based on [DOC: SOP_001.pdf, PAGE: 15] and [DOC: Guide.pdf, PAGE: 42],
    the three-step process ensures compliance. Also see [DOC: Missing.pdf, PAGE: 99].
    """
    
    # Simulate chunk metadata from AI Search
    chunks = [
        ChunkMetadata(
            chunk_id="chunk_001",
            document_name="SOP_001.pdf",
            page_number=15,
            content="The three-step validation process includes..."
        ),
        ChunkMetadata(
            chunk_id="chunk_002",
            document_name="Guide.pdf",
            page_number=42,
            content="Compliance requirements specify that..."
        )
    ]
    
    print("LLM Response:")
    print(llm_response_3)
    print()
    print(f"Available chunks: {len(chunks)}")
    for chunk in chunks:
        print(f"  - {chunk.document_name}, Page {chunk.page_number} (ID: {chunk.chunk_id})")
    print()
    
    # Parse and validate
    validated_refs = parser.parse_and_validate(llm_response_3, chunks)
    
    print(f"Validation results:")
    for i, ref in enumerate(validated_refs, 1):
        status = "✓ Valid" if ref.validated else "✗ Invalid"
        chunk_info = f" (Chunk: {ref.chunk_id})" if ref.chunk_id else ""
        print(f"  {i}. {status}: [{ref.document_name}, Page {ref.page_number}]{chunk_info}")
    print()
    
    # Example 4: Structured output
    print("Example 4: Get structured dictionary output")
    print("-" * 70)
    
    structured = parser.get_structured_references(llm_response_3, chunks)
    
    print("JSON-ready output:")
    import json
    print(json.dumps(structured, indent=2))
    print()
    
    # Example 5: Edge cases
    print("Example 5: Edge cases")
    print("-" * 70)
    
    edge_cases = [
        ("No references", "This response has no citations at all."),
        ("Extra whitespace", "[DOC:   document.pdf  ,  PAGE:   42  ]"),
        ("Case variations", "[doc: Test.pdf, page: 1] and [DOC: TEST2.pdf, PAGE: 2]"),
        ("Complex names", "[DOC: My_Document-v2.3 (Final).pdf, PAGE: 123]"),
    ]
    
    for case_name, response in edge_cases:
        refs = parser.extract_references(response)
        print(f"{case_name}: Found {len(refs)} reference(s)")
        for ref in refs:
            print(f"  - {ref.document_name}, Page {ref.page_number}")
    
    print()
    print("="*70)
    print("Demo completed successfully!")
    print("="*70)


if __name__ == "__main__":
    main()
