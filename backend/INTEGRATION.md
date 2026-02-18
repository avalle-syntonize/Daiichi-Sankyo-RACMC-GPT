# Integration Guide

## Overview

This guide explains how to integrate the reference parser into the RACMC-GPT RAG pipeline.

## Architecture Flow

```
User Query → Frontend → Backend → Azure AI Search → LLM → Parser → Frontend
```

1. **User submits query** through frontend
2. **Backend receives query** and retrieves relevant chunks from Azure AI Search
3. **Context is prepared** with chunk metadata (document_name, page_number)
4. **LLM generates response** with embedded references
5. **Parser extracts references** from LLM response
6. **References are validated** against retrieved chunks
7. **Structured references** returned to frontend
8. **Frontend displays** clickable citation badges

## Integration Steps

### 1. Backend API Endpoint

Create an endpoint that uses the parser:

```python
from fastapi import FastAPI
from app.services import ReferenceParser
from app.models import ChunkMetadata

app = FastAPI()
parser = ReferenceParser()

@app.post("/api/query")
async def query(question: str):
    # 1. Retrieve chunks from Azure AI Search
    chunks = await search_service.search(question)
    
    # 2. Prepare context for LLM
    context = prepare_context(chunks)
    
    # 3. Get LLM response
    llm_response = await llm_service.generate(question, context)
    
    # 4. Extract and validate references
    references = parser.parse_and_validate(llm_response, chunks)
    
    # 5. Return response with references
    return {
        "answer": llm_response,
        "references": [ref.to_dict() for ref in references]
    }
```

### 2. Prepare Context for LLM

Include metadata in the context:

```python
def prepare_context(chunks: List[ChunkMetadata]) -> str:
    context_parts = []
    
    for chunk in chunks:
        context_parts.append(
            f"Document: {chunk.document_name}, Page: {chunk.page_number}\n"
            f"Content: {chunk.content}\n"
        )
    
    return "\n---\n".join(context_parts)
```

### 3. System Prompt

Use the system prompt from PROMPT_FORMAT.md:

```python
SYSTEM_PROMPT = """
You are RACMC-GPT, an AI assistant specialized in Regulatory Affairs.

IMPORTANT - Citation Format:
When citing information, you MUST use this exact format:
[DOC: document_name, PAGE: page_number]

Example: According to [DOC: EMA_Guideline_v2.pdf, PAGE: 15]...

Always cite your sources using this format immediately after the cited information.
"""
```

### 4. Frontend Integration

The frontend can receive and display references:

```typescript
interface Reference {
  document_name: string;
  page_number: number;
  chunk_id: string | null;
  validated: boolean;
}

interface QueryResponse {
  answer: string;
  references: Reference[];
}

// Display references as clickable badges
function displayReferences(references: Reference[]) {
  return references.map(ref => (
    <Badge 
      onClick={() => showDocumentPreview(ref)}
      variant={ref.validated ? "success" : "warning"}
    >
      {ref.document_name}, p. {ref.page_number}
    </Badge>
  ));
}
```

## Testing Integration

### Unit Tests (Already Implemented)

```bash
cd backend
python -m pytest tests/ -v
```

### Integration Tests (To be implemented)

Test the complete flow:

```python
def test_end_to_end_query():
    # Mock Azure AI Search
    mock_chunks = [
        ChunkMetadata("id1", "doc.pdf", 5, "content")
    ]
    
    # Mock LLM response with reference
    mock_llm_response = "According to [DOC: doc.pdf, PAGE: 5]..."
    
    # Parse and validate
    parser = ReferenceParser()
    refs = parser.parse_and_validate(mock_llm_response, mock_chunks)
    
    assert len(refs) == 1
    assert refs[0].validated == True
```

## Configuration

### Environment Variables

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/
AZURE_OPENAI_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=gpt-4

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_KEY=your-key
AZURE_SEARCH_INDEX=documents
```

## Error Handling

Handle cases where references cannot be validated:

```python
def handle_references(references: List[Reference]):
    validated = [r for r in references if r.validated]
    invalid = [r for r in references if not r.validated]
    
    if invalid:
        logger.warning(
            f"Found {len(invalid)} unvalidated references",
            extra={"references": invalid}
        )
    
    return {
        "validated_references": validated,
        "warnings": [
            f"Could not validate: {r.document_name}, p.{r.page_number}"
            for r in invalid
        ]
    }
```

## Monitoring

Track reference extraction metrics:

```python
from azure.monitor import ApplicationInsights

def track_reference_metrics(references: List[Reference]):
    insights = ApplicationInsights()
    
    insights.track_metric("references_extracted", len(references))
    insights.track_metric(
        "references_validated",
        sum(1 for r in references if r.validated)
    )
```

## Best Practices

1. **Always validate references** against retrieved chunks
2. **Log unvalidated references** for review
3. **Include document metadata** in LLM context
4. **Test with various document types** (PDF, DOCX, etc.)
5. **Handle edge cases** (missing pages, malformed names)
6. **Monitor citation quality** over time

## Future Enhancements

1. Fuzzy matching for document names
2. Page range support: `[DOC: doc.pdf, PAGES: 5-7]`
3. Section references: `[DOC: doc.pdf, SECTION: 2.3]`
4. Confidence scores for validation
5. Reference deduplication
6. Citation clustering by topic

## Troubleshooting

### References not extracted

- Check LLM is using correct format
- Verify system prompt includes citation instructions
- Review regex pattern in parser

### References not validated

- Ensure chunk metadata includes document_name and page_number
- Check document names match exactly
- Verify page numbers are integers

### Performance issues

- Cache parser instance
- Batch validate references
- Index chunks by document_name for faster lookup

## Support

For issues or questions:
- Review backend/README.md
- Check backend/PROMPT_FORMAT.md
- Run example_usage.py
- Check test cases in tests/test_reference_parser.py
