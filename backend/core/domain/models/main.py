from dataclasses import dataclass
from typing import List, Optional, Any, Dict
from enum import Enum
from pydantic import BaseModel, Field, model_validator

class Feedback(str, Enum):
    Neutral = "neutral"
    Positive = "positive"
    Negative = "negative"
    MissingCitation = "missing_citation"
    WrongCitation = "wrong_citation"
    OutOfScope = "out_of_scope"
    InaccurateOrIrrelevant = "inaccurate_or_irrelevant"
    OtherUnhelpful = "other_unhelpful"
    HateSpeech = "hate_speech"
    Violent = "violent"
    Sexual = "sexual"
    Manipulative = "manipulative"
    OtherHarmful = "other_harmlful"


@dataclass
class Citation:
    content: str
    id: str
    part_index: Optional[int] = None
    title: Optional[str] = None
    filepath: Optional[str] = None
    url: Optional[str] = None
    metadata: Optional[str] = None
    chunk_id: Optional[str] = None
    reindex_id: Optional[str] = None


@dataclass
class AskResponse:
    answer: str
    citations: List[Citation]
    error: Optional[str] = None
    message_id: Optional[str] = None
    feedback: Optional[Feedback] = None


@dataclass
class ToolMessageContent:
    citations: List[Citation]
    intent: str


@dataclass
class ChatMessage:
    id: str
    role: str
    content: str
    image_content: Optional[str] = None
    file_content: Optional[str] = None
    attachment_type: Optional[str] = None
    end_turn: Optional[bool] = None
    date: str = ""
    feedback: Optional[Feedback] = None
    context: Optional[str] = None


@dataclass
class Conversation:
    id: str
    title: str
    messages: List[ChatMessage]
    date: str


class ChatCompletionType(str, Enum):
    ChatCompletion = "chat.completion"
    ChatCompletionChunk = "chat.completion.chunk"


@dataclass
class ChatResponseChoice:
    messages: List[ChatMessage]


@dataclass
class HistoryMetadata:
    conversation_id: str
    title: str
    date: str


@dataclass
class ChatResponse:
    id: str
    model: str
    created: int
    object: ChatCompletionType
    choices: List[ChatResponseChoice]
    history_metadata: HistoryMetadata
    error: Optional[Any] = None


@dataclass
class ConversationRequest:
    messages: List[ChatMessage]


@dataclass
class UserInfo:
    access_token: str
    expires_on: str
    id_token: str
    provider_name: str
    user_claims: List[Any]
    user_id: str


class CosmosDBStatus(str, Enum):
    NotConfigured = "CosmosDB is not configured"
    NotWorking = "CosmosDB is not working"
    InvalidCredentials = "CosmosDB has invalid credentials"
    InvalidDatabase = "Invalid CosmosDB database name"
    InvalidContainer = "Invalid CosmosDB container name"
    Working = "CosmosDB is configured and working"


@dataclass
class CosmosDBHealth:
    cosmosDB: bool
    status: str


class ChatHistoryLoadingState(str, Enum):
    Loading = "loading"
    Success = "success"
    Fail = "fail"
    NotStarted = "notStarted"


@dataclass
class ErrorMessage:
    title: str
    subtitle: str


@dataclass
class UI:
    title: str
    chat_title: str
    chat_description: str
    logo: Optional[str] = None
    chat_logo: Optional[str] = None
    show_share_button: Optional[bool] = None
    show_upload_button: Optional[bool] = None
    news_header: Optional[str] = None


@dataclass
class FrontendSettings:
    appinsights_connection_string: Optional[str] = None
    auth_enabled: Optional[str] = None
    feedback_enabled: Optional[str] = None
    ui: Optional[UI] = None
    sanitize_answer: Optional[bool] = None





class LanguageEnum(Enum):
    SPANISH = 'SP'
    ENGLISH = 'EN'
    GERMAN = 'DE'
    FRENCH = 'FR'
    DUTCH = 'NL'
    
class Language(BaseModel):
    language: LanguageEnum = Field(description="language that has been detected", default='EN')