from langchain_core.prompts.chat import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.prompts import MessagesPlaceholder
# from chains.utils.language_selector import Language

def build_chatbot_prompt() -> ChatPromptTemplate:
    """Returns a ChatPromptTemplate object for building a chatbot prompt.
    
    The system prompt includes information about the AI assistant and instructions for responding. It also includes a placeholder for context to be filled in.
    The function returns a ChatPromptTemplate object with the system prompt, a placeholder for chat history, and a placeholder for human input.
    """
    system_prompt = (
        "You are an AI assistant called dsGPT based on GPT4, that helps DSE employees with their everyday tasks and find information."
        "If you do not have information in the context provided answer without using the context."
        "If you use documents from context to answer the question always say that you have used them by saying at the end: ┐"
        "If you are asked What can you help me with? or some variation of this question answer the following: I can assist you with a variety of tasks, including but not limited to:"
        "Finding Information, Daily Tasks, Technical Support, Document Assistance, Research, Data Analysis, Language Translation (develop each point always centered on Daiichi Sankyo)."
        "\n\n"
        "<context>\n"
        "{context}"
        "\n</context>"
    )

    return ChatPromptTemplate.from_messages(
        [
            ("system", system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )

def build_contextualize_prompt() -> ChatPromptTemplate:
    """Builds a contextualize prompt for chat system.
    
    Returns:
        ChatPromptTemplate: A template for contextualizing a user question based on chat history.
    """
    contextualize_q_system_prompt = (
        "Given a chat history and the latest user question "
        "which might reference context in the chat history, "
        "formulate a standalone question which can be understood "
        "without the chat history. Do NOT answer the question, "
        "just reformulate it if needed and otherwise return it as is."
    )

    return ChatPromptTemplate.from_messages(
        [
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ]
    )

def augment_prompt_generated() -> ChatPromptTemplate:
    """Generate augmented prompts for a chatbot system.
    
        This function generates augmented prompts for a chatbot system. It creates five different versions of a given user question to retrieve relevant documents from a vector database. By providing multiple perspectives on the user question, the goal is to assist the user in overcoming limitations of distance-based similarity search.
    
        Returns:
            ChatPromptTemplate: A template containing the system prompt and a placeholder for the user question.
    """
    augmente_q_system_prompt = (
        "You are an AI language model assistant. Your task is to generate 3 "
        "different versions of the given user question to retrieve relevant documents from a vector "
        "database. By generating multiple perspectives on the user question, your goal is to help "
        "the user overcome some of the limitations of the distance-based similarity search. "
        "Provide these alternative questions separated by newlines."
    )

    return ChatPromptTemplate.from_messages(
        [
            ("system", augmente_q_system_prompt),
            ("human", "{question}"),
        ]
    )

def build_language_prompt() -> ChatPromptTemplate:
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