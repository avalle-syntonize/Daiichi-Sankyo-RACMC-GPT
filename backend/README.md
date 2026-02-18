# RACMC-GPT Backend

Backend services for the RACMC-GPT application, including LLM reference parsing and validation.

## Structure

```
backend/
├── app/
│   ├── models/          # Data models
│   │   └── reference.py # Reference and ChunkMetadata models
│   ├── services/        # Business logic
│   │   └── reference_parser.py  # LLM reference parser
│   └── utils/           # Utility functions
├── tests/               # Unit tests
│   └── test_reference_parser.py
└── requirements.txt     # Python dependencies
```

## Reference Parser

The reference parser extracts and validates citations from LLM responses.

### Reference Format

The LLM is instructed to cite information using this format:
```
[DOC: document_name, PAGE: page_number]
```

Example:
```
[DOC: IMPD_Guidelines_v2.3.pdf, PAGE: 47]
```

### Usage

```python
from app.services import ReferenceParser
from app.models import ChunkMetadata

# Initialize parser
parser = ReferenceParser()

# Parse LLM response
llm_response = """
The process requires validation [DOC: SOP_001.pdf, PAGE: 15].
See also [DOC: Guide.pdf, PAGE: 42] for details.
"""

# Extract references
references = parser.extract_references(llm_response)
print(f"Found {len(references)} references")

# Validate against chunk metadata
chunks = [
    ChunkMetadata("chunk1", "SOP_001.pdf", 15, "Process steps..."),
    ChunkMetadata("chunk2", "Guide.pdf", 42, "Detailed info...")
]

validated_refs = parser.validate_references(references, chunks)

# Or do both in one step
references = parser.parse_and_validate(llm_response, chunks)

# Get structured output
structured = parser.get_structured_references(llm_response, chunks)
```

### API

#### `ReferenceParser.extract_references(llm_response: str) -> List[Reference]`
Extracts all references from LLM response text.

#### `ReferenceParser.validate_reference(reference: Reference, chunks: List[ChunkMetadata]) -> bool`
Validates a single reference against chunk metadata.

#### `ReferenceParser.validate_references(references: List[Reference], chunks: List[ChunkMetadata]) -> List[Reference]`
Validates multiple references against chunk metadata.

#### `ReferenceParser.parse_and_validate(llm_response: str, chunks: Optional[List[ChunkMetadata]]) -> List[Reference]`
Extracts and validates references in one step.

#### `ReferenceParser.get_structured_references(llm_response: str, chunks: Optional[List[ChunkMetadata]]) -> List[dict]`
Returns references as structured dictionaries.

## Testing

Run tests with pytest:

```bash
cd backend
python -m pytest tests/ -v
```

Run with coverage:

```bash
python -m pytest tests/ --cov=app --cov-report=html
```

## Development

Install dependencies:

```bash
pip install -r requirements.txt
```

## Models

### Reference
Represents a citation extracted from LLM response.

```python
@dataclass
class Reference:
    document_name: str      # Name of the document
    page_number: int        # Page number
    chunk_id: Optional[str] # ID of matching chunk (after validation)
    validated: bool         # Whether reference is validated
```

### ChunkMetadata
Represents metadata for a document chunk from AI Search.

```python
@dataclass
class ChunkMetadata:
    chunk_id: str          # Unique chunk identifier
    document_name: str     # Document name
    page_number: int       # Page number
    content: str           # Chunk content
```

## Integration

The reference parser is designed to be integrated into the RAG pipeline:

1. LLM generates response with references in format `[DOC: name, PAGE: num]`
2. Parser extracts references from response
3. References are validated against chunk metadata from AI Search
4. Validated references are returned to frontend for display
5. Frontend can show citation badges and link to source documents
