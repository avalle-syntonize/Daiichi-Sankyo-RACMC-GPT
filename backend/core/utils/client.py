import json
import numpy as np
from typing import Any, Dict, List, Optional, Tuple
from langchain_core.documents import Document
from azure.search.documents.aio import AsyncSearchItemPaged
from langchain_community.vectorstores.azuresearch import (
    AzureSearch,
    FIELDS_CONTENT,
    FIELDS_METADATA,
    FIELDS_CONTENT_VECTOR,
)


def _result_to_document(result: Dict) -> Document:
    return Document(
        page_content=result.pop(FIELDS_CONTENT),
        metadata=json.loads(result[FIELDS_METADATA])
        if FIELDS_METADATA in result
        else {
            key: value for key, value in result.items() if key != FIELDS_CONTENT_VECTOR
        },
    )
    
async def _aresults_to_documents(
    results: AsyncSearchItemPaged[Dict],
) -> List[Tuple[Document, float]]:
    docs = [
        (
            _result_to_document(result),
            float(result["@search.score"]),
        )
        async for result in results
    ]
    return docs

class AsyncAzureSearch(AzureSearch):
    async def _asimple_search(
        self,
        embedding: List[float],
        text_query: str,
        k: int,
        *,
        filters: Optional[str] = None,
        **kwargs: Any,
    ) -> AsyncSearchItemPaged[dict]:
        from azure.search.documents.models import VectorizedQuery

        async with self.async_client as async_client:
            results = await async_client.search(
                search_text=text_query,
                vector_queries=[
                    VectorizedQuery(
                        vector=np.array(embedding, dtype=np.float32).tolist(),
                        k_nearest_neighbors=k,
                        fields=FIELDS_CONTENT_VECTOR,
                    )
                ],
                filter=filters,
                top=10,
                **kwargs,
            )
            return await _aresults_to_documents(results)

    async def ahybrid_search_with_score(
        self,
        query: str,
        k: int = 4,
        filters: Optional[str] = None,
        **kwargs: Any,
    ) -> List[Tuple[Document, float]]:
        embedding = await self._aembed_query(query)
        return await self._asimple_search(
            embedding, query, k, filters=filters, **kwargs
        )
