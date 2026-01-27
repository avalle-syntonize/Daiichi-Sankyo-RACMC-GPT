import os
from azure.search.documents.indexes.models import (
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SimpleField,
)
from dotenv import load_dotenv

load_dotenv()

AZURESEARCH_FIELDS_CONTENT_VECTOR = os.environ.get("AZURESEARCH_FIELDS_CONTENT_VECTOR")

INDEX_NAME = os.environ.get("INDEX_NAME")

AZURE_DEPLOYMENT_EMBEDDING = os.environ.get("AZURE_DEPLOYMENT_EMBEDDING")

OPENAI_API_VERSION = os.environ.get("OPENAI_API_VERSION")

VECTOR_STORE_ADDRESS = os.environ.get("VECTOR_STORE_ADDRESS")

VECTOR_STORE_PASSWORD = os.environ.get("VECTOR_STORE_PASSWORD")

LANGUAGES_CODE = {
    "english": "EN",
    "german": "DE",
    "spanish": "SP",
    "dutch": "NL",
    "french": "FR",
}

FIELDS = [
    SimpleField(
        name="id",
        type=SearchFieldDataType.String,
        key=True,
        filterable=True,
    ),
    SearchableField(
        name="content",
        type=SearchFieldDataType.String,
        searchable=True,
    ),
    SearchField(
        name="contentVector",
        type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
        searchable=True,
        vector_search_dimensions=3072,
        vector_search_profile_name="myHnswProfile",
    ),
    SearchableField(
        name="metadata",
        type=SearchFieldDataType.String,
        searchable=True,
    ),
    SearchableField(
        name="url",
        type=SearchFieldDataType.String,
        searchable=True,
    ),
    SimpleField(
        name="title",
        type=SearchFieldDataType.String,
        searchable=True,
    ),
    SearchableField(
        name="filepath",
        type=SearchFieldDataType.String,
        searchable=True,
        filterable=True,
    ),
    SearchableField(
        name="language",
        type=SearchFieldDataType.String,
        searchable=True,
        filterable=True,
    ),
]