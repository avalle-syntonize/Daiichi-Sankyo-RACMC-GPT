

from typing import Any, Dict
from core.domain.ports.chatbot_repository import ChatbotRepository

class ChatbotApplication:
    def __init__(self, repository: ChatbotRepository):
        self.repository = repository
    
    async def get_completions(self, context: Dict[str, Any], stream_response: bool = False):
        return await self.repository.get_completions(context, stream_response)