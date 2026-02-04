import copy
import logging
from threading import Thread
from typing import Any, Dict, List
# from core.domain.models.main import ChatMessage
from core.chains.embeddings import build_embeddings_model
from core.utils.azure_search import build_azure_search_store_async
from core.domain.models import Language
from core.chains.prompt import build_chatbot_prompt, build_contextualize_prompt
from core.utils.utils import format_as_ndjson, format_streaming_response_langchain
from core.domain.ports.chatbot_repository import ChatbotRepository
from langchain_chroma import Chroma
from langchain_openai import AzureChatOpenAI, AzureOpenAIEmbeddings
import os
import uuid
import base64
from langchain_community.document_loaders import PyPDFLoader, TextLoader, UnstructuredExcelLoader, UnstructuredPowerPointLoader, Docx2txtLoader
from langchain_community.document_loaders.csv_loader import UnstructuredCSVLoader
import tempfile
from time import sleep
from azure.identity.aio import DefaultAzureCredential, get_bearer_token_provider
from openai import AsyncAzureOpenAI
from langchain_core.prompts.chat import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.runnables import RunnableSerializable
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains.history_aware_retriever import create_history_aware_retriever
from langchain_classic.chains.retrieval import create_retrieval_chain
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables import ConfigurableFieldSpec
from langchain_classic.retrievers import EnsembleRetriever
from langchain_core.vectorstores import VectorStoreRetriever
# from quart import (
#     Blueprint,
#     Quart,
#     jsonify,
#     make_response,
#     request,
#     send_from_directory,
#     render_template,
# )

# from fastapi.responses import JSONResponse, StreamingResponse
from azurefunctions.extensions.http.fastapi import JSONResponse, StreamingResponse


AZURE_OPENAI_SYSTEM_MESSAGE = os.environ.get(
    "AZURE_OPENAI_SYSTEM_MESSAGE",
    "You are an AI assistant that helps people find information.",
)

USER_AGENT = "RACMC-GPT/AsyncAzureOpenAI/1.0.0"

AZURE_SEARCH_KEY = os.environ.get("AZURE_SEARCH_KEY", None)
AZURE_OPENAI_MODEL = os.environ.get("AZURE_OPENAI_MODEL")
AZURE_OPENAI_STREAM = os.environ.get("AZURE_OPENAI_STREAM", "true")
SHOULD_STREAM = True if AZURE_OPENAI_STREAM.lower() == "true" else False
SEARCH_STRICTNESS = os.environ.get("SEARCH_STRICTNESS", 3)
AZURE_OPENAI_TOP_P = os.environ.get("AZURE_OPENAI_TOP_P", 1.0)
AZURE_OPENAI_MAX_TOKENS = os.environ.get("AZURE_OPENAI_MAX_TOKENS", 1000)
AZURE_OPENAI_TEMPERATURE = os.environ.get("AZURE_OPENAI_TEMPERATURE", 0)
AZURE_SEARCH_SERVICE = os.environ.get("AZURE_SEARCH_SERVICE")
AZURE_SEARCH_INDEX = os.environ.get("AZURE_SEARCH_INDEX")
AZURE_OPENAI_STOP_SEQUENCE = os.environ.get("AZURE_OPENAI_STOP_SEQUENCE")
AZURE_SEARCH_CONTENT_COLUMNS = os.environ.get("AZURE_SEARCH_CONTENT_COLUMNS")
SEARCH_TOP_K = os.environ.get("SEARCH_TOP_K", 5)
AZURE_SEARCH_FILENAME_COLUMN = os.environ.get("AZURE_SEARCH_FILENAME_COLUMN")
AZURE_SEARCH_TITLE_COLUMN = os.environ.get("AZURE_SEARCH_TITLE_COLUMN")
AZURE_SEARCH_URL_COLUMN = os.environ.get("AZURE_SEARCH_URL_COLUMN")
AZURE_SEARCH_VECTOR_COLUMNS = os.environ.get("AZURE_SEARCH_VECTOR_COLUMNS")
AZURE_SEARCH_QUERY_TYPE = os.environ.get("AZURE_SEARCH_QUERY_TYPE")
AZURE_SEARCH_PERMITTED_GROUPS_COLUMN = os.environ.get(
    "AZURE_SEARCH_PERMITTED_GROUPS_COLUMN"
)
AZURE_SEARCH_STRICTNESS = os.environ.get(
    "AZURE_SEARCH_STRICTNESS", SEARCH_STRICTNESS)
AZURE_SEARCH_USE_SEMANTIC_SEARCH = os.environ.get(
    "AZURE_SEARCH_USE_SEMANTIC_SEARCH", "false"
)
AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG = os.environ.get(
    "AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG", "default"
)
AZURE_SEARCH_TOP_K = os.environ.get("AZURE_SEARCH_TOP_K", SEARCH_TOP_K)
AZURE_OPENAI_EMBEDDING_NAME = os.environ.get("AZURE_OPENAI_EMBEDDING_NAME", "")
AZURE_OPENAI_EMBEDDING_KEY = os.environ.get("AZURE_OPENAI_EMBEDDING_KEY")
AZURE_OPENAI_STREAM = os.environ.get("AZURE_OPENAI_STREAM", "true")
AZURE_OPENAI_MODEL_NAME = os.environ.get(
    "AZURE_OPENAI_MODEL_NAME", "gpt-35-turbo-16k"
)  # Name of the model, e.g. 'gpt-35-turbo-16k' or 'gpt-4'
AZURE_OPENAI_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_EMBEDDING_ENDPOINT = os.environ.get(
    "AZURE_OPENAI_EMBEDDING_ENDPOINT")
MINIMUM_SUPPORTED_AZURE_OPENAI_PREVIEW_API_VERSION = "2024-02-15-preview"
AZURE_OPENAI_PREVIEW_API_VERSION = os.environ.get(
    "AZURE_OPENAI_PREVIEW_API_VERSION",
    MINIMUM_SUPPORTED_AZURE_OPENAI_PREVIEW_API_VERSION,
)
AZURE_OPENAI_RESOURCE = os.environ.get("AZURE_OPENAI_RESOURCE")
AZURE_OPENAI_KEY = os.environ.get("AZURE_OPENAI_KEY")
SEARCH_ENABLE_IN_DOMAIN = os.environ.get("SEARCH_ENABLE_IN_DOMAIN", "true")
AZURE_SEARCH_ENABLE_IN_DOMAIN = os.environ.get(
    "AZURE_SEARCH_ENABLE_IN_DOMAIN", SEARCH_ENABLE_IN_DOMAIN
)

mime_to_extension = {         
    'application/pdf': '.pdf',        
    'text/plain': '.txt',         
    'application/msword': '.doc',        
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',        
    'application/vnd.ms-excel': '.csv',        
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',        
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',      
    'text/csv': '.csv'
}  
SHOULD_USE_DATA = False

class ChatbotAdapter(ChatbotRepository):
    
    def __init__(self):
        SHOULD_USE_DATA = self.should_use_data()
        self.stream = False
     
    def create_embeddings(model: str = AZURE_OPENAI_EMBEDDING_NAME) -> AzureOpenAIEmbeddings:  
        return AzureOpenAIEmbeddings(model=AZURE_OPENAI_EMBEDDING_NAME)

    def create_vector_store(self, embeddings: AzureOpenAIEmbeddings, collection_name: str) -> Chroma:  
        return Chroma(  
            collection_name=collection_name,  
            embedding_function=embeddings
        )

    def get_extension_from_mime(mime_type):  
        """  
        Get the file extension for a given MIME type.  
    
        Parameters:  
        mime_type (str): The MIME type to look up.  
    
        Returns:  
        str: The file extension corresponding to the MIME type, or None if not found.  
        """  
        return mime_to_extension.get(mime_type, None) 

    def delimiter(data):
        rows = data[:100].split("\n")
        if rows[0].count(";") > 0:
            return ";"
        if rows[0].count("\t") > 0:
            return "\t"
        return ","

    async def process_file_into_document_chunks(self, binary_data, mime_type):
        suffix = self.get_extension_from_mime(mime_type)
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as temp:
            temp.write(binary_data)
            temp.flush()
            
            loaders = {
            ".pdf": PyPDFLoader,
            ".xlsx": UnstructuredExcelLoader,
            ".xls": UnstructuredExcelLoader,
            ".pptx": UnstructuredPowerPointLoader,
            ".ppt": UnstructuredPowerPointLoader,
            ".docx": Docx2txtLoader,
            ".doc": Docx2txtLoader,
            ".csv": UnstructuredCSVLoader,
            ".txt": TextLoader,
            }
            if suffix == "csv":
                loader = loaders.get(suffix, csv_args={"delimiter": self.delimiter(binary_data)})(file_path=temp.name)
            loader = loaders.get(suffix)(file_path=temp.name)
            document_chunks = loader.load()
            return document_chunks
  
    async def add_documents_to_store(self, vector_store: Chroma, documents: List[str] ) -> None:  
        uuids = [str(uuid.uuid4()) for _ in range(len(documents))]
        await vector_store.aadd_documents(documents=documents, ids=uuids) 

    async def get_completions(self, context: Dict[str, Any], stream_response: bool = False) -> str:
        collection_name = str(uuid.uuid4())
        embeddings = self.create_embeddings()
        vector_store = self.create_vector_store(embeddings=embeddings, collection_name=collection_name)
        filtered_messages = []  
        messages = context.get("messages", [])
        messageContainsAttachment = False
        has_last_image_content = False
        has_last_file_content = False
        last_message = messages[-1] if len(messages) > 1 else messages[0]
    
        if last_message.get('file_content', None) is not None:
            has_last_file_content = True  
    
        if last_message.get('image_content') is not None:  
            has_last_image_content = True  
    
        for message in messages:  
            if message.get("image_content") is not None:
                message["content"] = [  
                    {"type": "text", "text": message["content"]},  
                    {"type": "image_url", "image_url": {  
                        "url": message["image_content"]}}  
                ]  
                message.pop("image_content")  
                messageContainsAttachment = True  
    
            if message.get('file_content', None) is not None:
                if has_last_file_content:
                    file_bytes = base64.b64decode(message.get('file_content', None))  
                    documents = await self.process_file_into_document_chunks(file_bytes, message.get("attachment_type", None))
                    await self.add_documents_to_store(vector_store, documents)
                message.pop("file_content")
                messageContainsAttachment = True

            if message.get("role") != 'tool':
                filtered_messages.append(message)

        # request_body['messages'] = filtered_messages
        model_args = self.prepare_model_args(context, messageContainsAttachment)
        history_metadata = context.get("history_metadata", {})  
    
        try:  
            if has_last_image_content:  
                response = await self.stream_image_request(model_args, history_metadata)
            else:  
                response = await self.conversation_history(model_args, history_metadata, vector_store, ignore_external_documents=has_last_file_content,stream=stream_response)  
        except Exception as e:  
            logging.exception("Exception in send_chat_request")  
            raise e
        
        # Reset the vector store after 2 minutes
        Thread(target=self.reset_vector_store, args=(vector_store,)).start()
        return response
    
    def build_model(self, model: str =  None) -> AzureChatOpenAI:
        """Builds and returns an AzureChatOpenAI model for generating embeddings.
        
            Returns:
                Embeddings: An instance of AzureChatOpenAI model for generating embeddings.
        """
        if model:
            azure_deployment = os.environ.get("AZURE_OPENAI_MODEL")
        else :
            azure_deployment = os.environ.get("AZURE_OPENAI_MODEL_MINI")
        print(f"Using Azure OpenAI model: {azure_deployment}")
        return AzureChatOpenAI(
                azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
                azure_deployment=azure_deployment,
                api_version=os.environ.get("AZURE_OPENAI_PREVIEW_API_VERSION"),
                openai_api_key=os.environ.get("AZURE_OPENAI_KEY"),
            )

    def build_language_prompt(self) -> ChatPromptTemplate:
        """Returns a ChatPromptTemplate object for building a chatbot prompt.
        
        The system prompt includes information about the AI assistant and instructions for responding. It also includes a placeholder for context to be filled in.
        The function returns a ChatPromptTemplate object with the system prompt, a placeholder for chat history, and a placeholder for human input.
        """

        prompt_msg = """
        You are an expert translator and your job is to detect the language. Indicating the language in the format: 
        "SP for Spanish"
        "EN for English"
        "FR for French"
        "DE for German"
        "NL for Dutch".

        sentence
        -------
        {sentence}

        """
        prompt = ChatPromptTemplate(
            [
                HumanMessagePromptTemplate.from_template(prompt_msg),
            ],
            input_variables=["sentence"],
        )

        return prompt

    def build_language_chain(self):
        llm = self.build_model("mini")
        language_prompt = self.build_language_prompt()
        language = language_prompt | llm.with_structured_output(Language)
        return language
        
    def build_retriever(self,vector_store, ignore_external_documents, language) -> VectorStoreRetriever:
        """
        Builds a retriever object that retrieves vectors from an Azure Search store using an embeddings model.

        Returns:
            VectorStoreRetriever: A retriever object configured to retrieve vectors from an Azure Search store.
        """
        azure = build_azure_search_store_async(build_embeddings_model()).as_retriever(search_kwargs={"filters": f"language eq '{language}' or language eq 'EN'"})
        chroma = vector_store.as_retriever()
        retrievers = [azure, chroma] if not ignore_external_documents else [chroma]
        weights=[0.5, 0.5] if not ignore_external_documents else [1.0]
        return EnsembleRetriever(retrievers=retrievers, weights=weights)
    
    def build_chain(self, vector_store, ignore_external_documents,language) -> RunnableSerializable:
        """Builds a chain of components for a conversational AI system.
        
        This function constructs a chain of components for a conversational AI system, including a language model, chatbot prompt, retrievers, parsers, and more.
        
        Returns:
            RunnableSerializable: The chain of components for the conversational AI system.
        """
        llm = self.build_model()
        prompt = build_chatbot_prompt()
        retriever = self.build_retriever(vector_store, ignore_external_documents, language)
        question_answer_chain = create_stuff_documents_chain(llm, prompt)
        history_aware_retriever = create_history_aware_retriever(
            llm, retriever, build_contextualize_prompt()
        )

        rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)

        return rag_chain    

    def get_session_history(self, messages: List[Dict[str, str]]) -> List[str]:
        """Returns a list of user and assistant messages from the given list of messages.
        
            Args:
                messages (List[Dict[str, str]]): A list of dictionaries containing message information.
        
            Returns:
                List[str]: A list of user and assistant messages.
        """
        history = ChatMessageHistory()
        for message in messages:
            if message['role'] == 'user':
                history.add_user_message(message['content'])
                
            elif message['role'] == 'assistant':
                history.add_ai_message(message['content'])
        return history

    def build_message_history(self, vector_store, ignore_external_documents, language) -> RunnableWithMessageHistory:
        """Builds a message history for a RunnableWithMessageHistory object.
        
        Returns:
            RunnableWithMessageHistory: A RunnableWithMessageHistory object with specified parameters.
        """
        return RunnableWithMessageHistory(self.build_chain(vector_store, ignore_external_documents, language),
                 self.get_session_history,
                input_messages_key="input",
                history_messages_key="chat_history",
                output_messages_key="answer",
                history_factory_config=[ConfigurableFieldSpec
                                        (id="messages",annotation=List[Dict[str, str]], name="messages",description="List of messages from history",
                                        default="",is_shared=True)])

    async def conversation_history(self, model_args, history_metadata, vector_store, ignore_external_documents, stream: bool = True):
        """
        Retrieves the conversation history and returns either a streaming response or full JSON.

        Args:
            model_args (dict): Model arguments including messages.
            history_metadata (dict): Metadata for the conversation history.
            vector_store: Vector store instance for retrieval.
            ignore_external_documents (bool): Whether to ignore external documents.
            stream (bool): If True, return StreamingResponse; if False, return JSONResponse.

        Returns:
            StreamingResponse or JSONResponse: Conversation history in the requested format.
        """
        try:
            last_message = {"input": f"{model_args['messages'][-1]['content']}"}

            # Detect language
            language = self.build_language_chain().invoke(
                {"sentence": f"{model_args['messages'][-1]['content']}"}
            ).language.value

            # Build conversational chain
            conversational_chain = self.build_message_history(vector_store, ignore_external_documents, language)
            
            # Stream generator
            response = conversational_chain.astream(
                last_message, config={"configurable": {"messages": model_args["messages"]}}
            )

            # STREAMING RESPONSE
            if stream:
                async def generate():
                    async for completionChunk in response:
                        yield format_streaming_response_langchain(completionChunk, history_metadata, last_message)
                return StreamingResponse(format_as_ndjson(generate()), media_type="application/json-lines")

            # FULL JSON RESPONSE
            else:
                all_chunks = []
                async for completionChunk in response:
                    chunk_json = format_streaming_response_langchain(completionChunk, history_metadata, last_message)
                    all_chunks.append(chunk_json)

                # Concatenar el contenido de todas las choices en un solo string
                full_content = ""
                for chunk in all_chunks:
                    choices = chunk.get("choices", [])
                    if choices:
                        messages = choices[0].get("messages", [])
                        for msg in messages:
                            if msg.get("role") == "assistant" and msg.get("content"):
                                full_content += msg["content"]

                final_response = {
                    "id": str(uuid.uuid4()),
                    "model": model_args.get("model", "unknown"),
                    "history_metadata": history_metadata,
                    "history": [],
                    "content": full_content
                }

                return JSONResponse(content=final_response)

        except Exception as ex:
            logging.exception(ex)
            status_code = getattr(ex, "status_code", 500)
            return JSONResponse(content={"error": str(ex)}, status_code=status_code)
    
    def should_use_data(self) -> bool:
        global DATASOURCE_TYPE

        if AZURE_SEARCH_SERVICE and AZURE_SEARCH_INDEX:
            DATASOURCE_TYPE = "AzureCognitiveSearch"
            logging.debug("Using Azure Cognitive Search")
            return True

        return False

    def init_openai_client(self, use_data=SHOULD_USE_DATA):
        azure_openai_client = None
        try:
            # API version check
            if (
                AZURE_OPENAI_PREVIEW_API_VERSION
                < MINIMUM_SUPPORTED_AZURE_OPENAI_PREVIEW_API_VERSION
            ):
                raise Exception(
                    f"The minimum supported Azure OpenAI preview API version is '{MINIMUM_SUPPORTED_AZURE_OPENAI_PREVIEW_API_VERSION}'"
                )

            # Endpoint
            if not AZURE_OPENAI_ENDPOINT and not AZURE_OPENAI_RESOURCE:
                raise Exception(
                    "AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_RESOURCE is required"
                )

            endpoint = (
                AZURE_OPENAI_ENDPOINT
                if AZURE_OPENAI_ENDPOINT
                else f"https://{AZURE_OPENAI_RESOURCE}.openai.azure.com/"
            )

            # Authentication
            aoai_api_key = AZURE_OPENAI_KEY
            ad_token_provider = None
            if not aoai_api_key:
                logging.debug("No AZURE_OPENAI_KEY found, using Azure AD auth")
                ad_token_provider = get_bearer_token_provider(
                    DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
                )

            # Deployment
            deployment = AZURE_OPENAI_MODEL
            if not deployment:
                raise Exception("AZURE_OPENAI_MODEL is required")

            # Default Headers
            default_headers = {"User-Agent": USER_AGENT}

            azure_openai_client = AsyncAzureOpenAI(
                api_version=AZURE_OPENAI_PREVIEW_API_VERSION,
                api_key=aoai_api_key,
                azure_ad_token_provider=ad_token_provider,
                default_headers=default_headers,
                azure_endpoint=endpoint,
            )

            return azure_openai_client
        except Exception as e:
            logging.exception("Exception in Azure OpenAI initialization", e)
            azure_openai_client = None
            raise e

    # @backoff.on_exception(backoff.expo, openai.RateLimitError)
    async def openai_client_chat_completion_rawresponse_with_backoff(self,azure_openai_client: AsyncAzureOpenAI, **model_args):
        return await azure_openai_client.chat.completions.with_raw_response.create(**model_args)

    def format_stream_response(self, chatCompletionChunk, history_metadata, apim_request_id):
        """Formats the response object for a chat completion chunk.
        
        Args:
            chatCompletionChunk: The chat completion chunk object.
            history_metadata: The history metadata to include in the response.
            apim_request_id: The APIM request ID to include in the response.
        
        Returns:
            A formatted response object containing the chat completion chunk details, history metadata, and APIM request ID.
        """
        response_obj = {
            "id": chatCompletionChunk.id,
            "model": chatCompletionChunk.model,
            "created": chatCompletionChunk.created,
            "object": chatCompletionChunk.object,
            "choices": [{"messages": []}],
            "history_metadata": history_metadata,
            "apim-request-id": apim_request_id,
        }

        if len(chatCompletionChunk.choices) > 0:
            delta = chatCompletionChunk.choices[0].delta
            if delta:
                if hasattr(delta, "context"):
                    messageObj = {"role": "tool", "content": json.dumps(delta.context)}
                    response_obj["choices"][0]["messages"].append(messageObj)
                    return response_obj
                if delta.role == "assistant" and hasattr(delta, "context"):
                    messageObj = {
                        "role": "assistant",
                        "context": delta.context,
                    }
                    response_obj["choices"][0]["messages"].append(messageObj)
                    return response_obj
                else:
                    if delta.content:
                        messageObj = {
                            "role": "assistant",
                            "content": delta.content,
                        }
                        response_obj["choices"][0]["messages"].append(messageObj)
                        return response_obj

        return {}

    async def stream_image_request(self, model_args, history_metadata):
        """Asynchronously streams an image request.

        Args:
            model_args: A dictionary containing arguments for the model.
            history_metadata: Metadata related to the history.

        Returns:
            A response in JSON format.

        Raises:
            Exception: If an error occurs during the process.
        """
        try:
            azure_openai_client = self.init_openai_client()
            raw_response = await self.openai_client_chat_completion_rawresponse_with_backoff(azure_openai_client, **model_args)
            response = raw_response.parse()
            apim_request_id = raw_response.headers.get("apim-request-id")

            async def generate():
                async for completionChunk in response:
                    yield self.format_stream_response(completionChunk, history_metadata, apim_request_id)
            result = generate()
            response_json = StreamingResponse(format_as_ndjson(result), media_type="application/json-lines")
            response_json.timeout = None
            response_json.mimetype = "application/json-lines"
            return response_json
        except Exception as ex:
            logging.exception(ex)
            if hasattr(ex, "status_code"):
                return JSONResponse ({"error": str(ex)}), ex.status_code
            else:
                return JSONResponse ({"error": str(ex)}), 500

    def parse_multi_columns(self,columns: str) -> list:
        """Parses a string of multiple columns separated by '|' or ',' and returns a list of columns.
        
            Args:
                columns (str): A string containing multiple columns separated by '|' or ','.
        
            Returns:
                list: A list of columns extracted from the input string.
        
            Example:
                parse_multi_columns("column1|column2|column3") -> ['column1', 'column2', 'column3']
        """
        if "|" in columns:
            return columns.split("|")
        else:
            return columns.split(",")

    def generateFilterString(self, userToken):
        """Generates a filter string based on the user's groups.
        
        Args:
            userToken (str): The user's token used to fetch groups.
        
        Returns:
            str: A filter string based on the user's groups for Azure search.
        """
        userGroups = None #fetchUserGroups(userToken)

        if not userGroups:
            logging.debug("No user groups found")

        group_ids = ", ".join([obj["id"] for obj in userGroups])
        return f"{AZURE_SEARCH_PERMITTED_GROUPS_COLUMN}/any(g:search.in(g, '{group_ids}'))"

    def get_configured_data_source(self):
        data_source = {}
        query_type = "simple"
        if DATASOURCE_TYPE == "AzureCognitiveSearch":
            # Set query type
            if AZURE_SEARCH_QUERY_TYPE:
                query_type = AZURE_SEARCH_QUERY_TYPE
            elif (
                AZURE_SEARCH_USE_SEMANTIC_SEARCH.lower() == "true"
                and AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG
            ):
                query_type = "semantic"

            # Set filter
            filter = None
            userToken = None
            if AZURE_SEARCH_PERMITTED_GROUPS_COLUMN:
                userToken = request.headers.get("X-MS-TOKEN-AAD-ACCESS-TOKEN", "")
                logging.debug(
                    f"USER TOKEN is {'present' if userToken else 'not present'}")
                if not userToken:
                    raise Exception(
                        "Document-level access control is enabled, but user access token could not be fetched."
                    )

                filter = self.generateFilterString(userToken)
                logging.debug(f"FILTER: {filter}")

            # Set authentication
            authentication = {}
            if AZURE_SEARCH_KEY:
                authentication = {"type": "api_key", "api_key": AZURE_SEARCH_KEY}
            else:
                # If key is not provided, assume AOAI resource identity has been granted access to the search service
                authentication = {"type": "system_assigned_managed_identity"}

            data_source = {
                "type": "azure_search",
                "parameters": {
                    "endpoint": f"https://{AZURE_SEARCH_SERVICE}.search.windows.net",
                    "authentication": authentication,
                    "index_name": AZURE_SEARCH_INDEX,
                    "fields_mapping": {
                        "content_fields": (
                            self.parse_multi_columns(AZURE_SEARCH_CONTENT_COLUMNS)
                            if AZURE_SEARCH_CONTENT_COLUMNS
                            else []
                        ),
                        "title_field": (
                            AZURE_SEARCH_TITLE_COLUMN if AZURE_SEARCH_TITLE_COLUMN else None
                        ),
                        "url_field": (
                            AZURE_SEARCH_URL_COLUMN if AZURE_SEARCH_URL_COLUMN else None
                        ),
                        "filepath_field": (
                            AZURE_SEARCH_FILENAME_COLUMN
                            if AZURE_SEARCH_FILENAME_COLUMN
                            else None
                        ),
                        "vector_fields": (
                            self.parse_multi_columns(AZURE_SEARCH_VECTOR_COLUMNS)
                            if AZURE_SEARCH_VECTOR_COLUMNS
                            else []
                        ),
                    },
                    "in_scope": (
                        True if AZURE_SEARCH_ENABLE_IN_DOMAIN.lower() == "true" else False
                    ),
                    "top_n_documents": (
                        int(AZURE_SEARCH_TOP_K) if AZURE_SEARCH_TOP_K else int(
                            SEARCH_TOP_K)
                    ),
                    "query_type": query_type,
                    "semantic_configuration": (
                        AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG
                        if AZURE_SEARCH_SEMANTIC_SEARCH_CONFIG
                        else ""
                    ),
                    "role_information": AZURE_OPENAI_SYSTEM_MESSAGE,
                    "filter": filter,
                    "strictness": (
                        int(AZURE_SEARCH_STRICTNESS)
                        if AZURE_SEARCH_STRICTNESS
                        else int(SEARCH_STRICTNESS)
                    ),
                },
            }

        else:
            raise Exception(
                f"DATASOURCE_TYPE is not configured or unknown: {DATASOURCE_TYPE}"
            )


        if "vector" in query_type.lower() and DATASOURCE_TYPE != "AzureMLIndex":
            embeddingDependency = {}
            if AZURE_OPENAI_EMBEDDING_NAME:
                embeddingDependency = {
                    "type": "deployment_name",
                    "deployment_name": AZURE_OPENAI_EMBEDDING_NAME,
                }
            elif AZURE_OPENAI_EMBEDDING_ENDPOINT and AZURE_OPENAI_EMBEDDING_KEY:
                embeddingDependency = {
                    "type": "endpoint",
                    "endpoint": AZURE_OPENAI_EMBEDDING_ENDPOINT,
                    "authentication": {
                        "type": "api_key",
                        "key": AZURE_OPENAI_EMBEDDING_KEY,
                    },
                }
            else:
                raise Exception(
                    f"Vector query type ({query_type}) is selected for data source type {DATASOURCE_TYPE} but no embedding dependency is configured"
                )
            data_source["parameters"]["embedding_dependency"] = embeddingDependency
        return data_source   

    def reset_vector_store(self,vector_store):
        sleep(120)
        vector_store.delete_collection()  

    def prepare_model_args(self,request_body, message_contains_attachment):
        """Prepares model arguments based on the request body and message_contains_attachment flag.

        Args:
            request_body (dict): The request body containing messages.
            message_contains_attachment (bool): A flag indicating if the message contains an image.

        Returns:
            dict: A dictionary containing the prepared model arguments.
        """
        request_messages = request_body.get("messages", [])
        messages = []
        if not SHOULD_USE_DATA:
            messages = [{"role": "system", "content": AZURE_OPENAI_SYSTEM_MESSAGE}]

        for message in request_messages:
            if message:
                messages.append(
                    {"role": message["role"], "content": message["content"]})

        model_args = {
            "messages": messages,
            "temperature": float(AZURE_OPENAI_TEMPERATURE),
            "max_tokens": int(AZURE_OPENAI_MAX_TOKENS),
            "top_p": float(AZURE_OPENAI_TOP_P),
            "stop": (
                self.parse_multi_columns(AZURE_OPENAI_STOP_SEQUENCE)
                if AZURE_OPENAI_STOP_SEQUENCE
                else None
            ),
            "stream": SHOULD_STREAM,
            "model": AZURE_OPENAI_MODEL,
        }

        if SHOULD_USE_DATA and not message_contains_attachment:
            model_args["extra_body"] = {
                "data_sources": [self.get_configured_data_source()]}

        model_args_clean = copy.deepcopy(model_args)
        if model_args_clean.get("extra_body"):
            secret_params = [
                "key",
                "connection_string",
                "embedding_key",
                "encoded_api_key",
                "api_key",
            ]
            for secret_param in secret_params:
                if model_args_clean["extra_body"]["data_sources"][0]["parameters"].get(
                    secret_param
                ):
                    model_args_clean["extra_body"]["data_sources"][0]["parameters"][
                        secret_param
                    ] = "*****"
            authentication = model_args_clean["extra_body"]["data_sources"][0][
                "parameters"
            ].get("authentication", {})
            for field in authentication:
                if field in secret_params:
                    model_args_clean["extra_body"]["data_sources"][0]["parameters"][
                        "authentication"
                    ][field] = "*****"
            embeddingDependency = model_args_clean["extra_body"]["data_sources"][0][
                "parameters"
            ].get("embedding_dependency", {})
            if "authentication" in embeddingDependency:
                for field in embeddingDependency["authentication"]:
                    if field in secret_params:
                        model_args_clean["extra_body"]["data_sources"][0]["parameters"][
                            "embedding_dependency"
                        ]["authentication"][field] = "*****"

        return model_args
        
           