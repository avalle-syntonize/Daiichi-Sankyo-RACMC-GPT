# LLM Prompt Format for References

## Overview

To enable proper citation extraction and traceability, the LLM must be instructed to include references in a specific format when generating responses.

## Reference Format

When the LLM cites information from retrieved documents, it should use the following format:

```
[DOC: document_name, PAGE: page_number]
```

### Examples

Single reference:
```
According to the validation protocol [DOC: IMPD_Guidelines_v2.3.pdf, PAGE: 47], 
the manufacturing process must include detailed descriptions...
```

Multiple references:
```
The process validation requires [DOC: EMA_Guidelines.pdf, PAGE: 12] at least 
three consecutive batches [DOC: ICH_Q7.pdf, PAGE: 34] with complete documentation 
[DOC: Internal_SOP.docx, PAGE: 8].
```

## Prompt Template

Include this instruction in the system prompt or user prompt:

```
When citing information from the retrieved documents, always use the format:
[DOC: document_name, PAGE: page_number]

For example: [DOC: IMPD_Guidelines_v2.3.pdf, PAGE: 47]

Place the citation immediately after the information being cited.
```

## Complete System Prompt Example

```
You are RACMC-GPT, an AI assistant specialized in Regulatory Affairs - Chemistry, 
Manufacturing and Controls (RA CMC) for the pharmaceutical industry.

Your role is to provide accurate, well-cited answers based on the retrieved 
documentation from SharePoint and internal guidelines.

IMPORTANT - Citation Format:
When citing information, you MUST use this exact format:
[DOC: document_name, PAGE: page_number]

Example: According to [DOC: EMA_Guideline_v2.pdf, PAGE: 15] the validation 
protocol requires...

Guidelines:
1. Always cite your sources using the format above
2. Place citations immediately after the cited information
3. Use the exact document name and page number from the retrieved chunks
4. Multiple citations in one response are expected and encouraged
5. Be specific - cite the actual page where the information appears

Retrieved Context:
{context}

User Question: {question}

Provide a detailed, accurate answer with proper citations.
```

## Integration with RAG Pipeline

1. **Document Retrieval**: Azure AI Search retrieves relevant chunks with metadata
2. **Chunk Metadata**: Each chunk includes:
   - `document_name`: Name of source document
   - `page_number`: Page number in original document
   - `content`: Text content of the chunk
   - `chunk_id`: Unique identifier

3. **Prompt Construction**: Include document metadata in the context
4. **LLM Response**: LLM generates answer with references
5. **Reference Extraction**: Backend parser extracts references
6. **Validation**: References validated against chunk metadata
7. **Frontend Display**: Validated references shown as clickable citations

## Example Context Format

When providing context to the LLM, include metadata:

```
Context Documents:

Document: IMPD_Guidelines_v2.3.pdf, Page: 47
Content: "Process validation protocols must include detailed descriptions 
of manufacturing process, critical process parameters, and acceptance criteria..."

Document: EMA_Guidelines.pdf, Page: 12
Content: "At least three consecutive batches must be manufactured to 
demonstrate process consistency..."

Document: ICH_Q7.pdf, Page: 34
Content: "Complete batch manufacturing records are required for all 
validation batches, including in-process controls..."
```

## Testing

Test the LLM with various queries to ensure:

1. Citations are properly formatted
2. Document names match retrieved chunks
3. Page numbers are correct
4. Citations are placed appropriately in the response
5. Multiple citations work correctly

## Error Handling

If the LLM fails to include citations:

1. Check system prompt includes citation instructions
2. Verify context includes document metadata
3. Consider adding few-shot examples
4. Fine-tune the prompt for better compliance

## Benefits

1. **Traceability**: Every claim is linked to source document
2. **Compliance**: Meets regulatory requirements for evidence
3. **Trust**: Users can verify information
4. **Navigation**: Click citations to view source
5. **Audit Trail**: Complete record of information sources
