import os
import json
import logging
import requests
import dataclasses
import time
import uuid
from typing import Any

DEBUG = os.environ.get("DEBUG", "false")
if DEBUG.lower() == "true":
    logging.basicConfig(level=logging.DEBUG)

AZURE_SEARCH_PERMITTED_GROUPS_COLUMN = os.environ.get(
    "AZURE_SEARCH_PERMITTED_GROUPS_COLUMN"
)


class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        if dataclasses.is_dataclass(o):
            return dataclasses.asdict(o)
        return super().default(o)


async def format_as_ndjson(r):
    """Format the input data stream as NDJSON format.
    
    Args:
        r: An async iterator that yields events to be formatted.
    
    Yields:
        str: A string representing each event in NDJSON format.
    
    Raises:
        Exception: If an error occurs while formatting the events.
    """
    try:
        async for event in r:
            yield json.dumps(event, cls=JSONEncoder) + "\n"
            
    except Exception as error:
        logging.exception("Exception while generating response stream: %s", error)
        yield json.dumps({"error": str(error)})


def parse_multi_columns(columns: str) -> list:
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


def fetchUserGroups(userToken, nextLink=None):
    """Recursively fetch group membership for a user using Microsoft Graph API.
    
    Args:
        userToken (str): The user's access token.
        nextLink (str, optional): The link to fetch the next page of results.
    
    Returns:
        list: A list of group IDs that the user is a member of.
    """
    if nextLink:
        endpoint = nextLink
    else:
        endpoint = "https://graph.microsoft.com/v1.0/me/transitiveMemberOf?$select=id"

    headers = {"Authorization": "bearer " + userToken}
    try:
        r = requests.get(endpoint, headers=headers)
        if r.status_code != 200:
            logging.error(f"Error fetching user groups: {r.status_code} {r.text}")
            return []

        r = r.json()
        if "@odata.nextLink" in r:
            nextLinkData = fetchUserGroups(userToken, r["@odata.nextLink"])
            r["value"].extend(nextLinkData)

        return r["value"]
    except Exception as e:
        logging.error(f"Exception in fetchUserGroups: {e}")
        return []


def generateFilterString(userToken):
    """Generates a filter string based on the user's groups.
    
    Args:
        userToken (str): The user's token used to fetch groups.
    
    Returns:
        str: A filter string based on the user's groups for Azure search.
    """
    userGroups = fetchUserGroups(userToken)

    if not userGroups:
        logging.debug("No user groups found")

    group_ids = ", ".join([obj["id"] for obj in userGroups])
    return f"{AZURE_SEARCH_PERMITTED_GROUPS_COLUMN}/any(g:search.in(g, '{group_ids}'))"


def format_non_streaming_response(chatCompletion, history_metadata, apim_request_id):
    """Format a non-streaming response for chat completion.
    
    Args:
        chatCompletion (object): The chat completion object.
        history_metadata (dict): Metadata related to the chat history.
        apim_request_id (str): The request ID for the API management.
    
    Returns:
        dict: A formatted response object with relevant information.
    """
    response_obj = {
        "id": chatCompletion.id,
        "model": chatCompletion.model,
        "created": chatCompletion.created,
        "object": chatCompletion.object,
        "choices": [{"messages": []}],
        "history_metadata": history_metadata,
        "apim-request-id": apim_request_id,
    }

    if len(chatCompletion.choices) > 0:
        message = chatCompletion.choices[0].message
        if message:
            if hasattr(message, "context"):
                response_obj["choices"][0]["messages"].append(
                    {
                        "role": "tool",
                        "content": json.dumps(message.context),
                    }
                )
            response_obj["choices"][0]["messages"].append(
                {
                    "role": "assistant",
                    "content": message.content,
                }
            )
            return response_obj

    return {}

def format_non_streaming_response_langchain(chatCompletion, history_metadata) -> (dict[str, Any] | dict):
    """Format non-streaming response for language chain.
    
    Args:
        chatCompletion (dict): The chat completion data.
        history_metadata (dict): The history metadata.
    
    Returns:
        dict: Formatted response object with necessary details.
    """
    timestamp = int(time.time())
    formatted_date = int(timestamp)
    id = str(uuid.uuid4())
    parsed_data = {"citations": [],"intent": ""}
    context_present = ("I have used context to answer this question" in chatCompletion["answer"]) or ("(Ich habe den Kontext verwendet, um diese Frage zu beantworten.)" in chatCompletion["answer"])

    response_obj = {
        "id": id,
        "model": os.environ.get("AZURE_OPENAI_MODEL"),
        "created": formatted_date,
        "object": "extensions.chat.completion",
        "choices": [{"messages": []}],
        "history_metadata": history_metadata,
        "apim-request-id": id,
    }

    if chatCompletion:
            docCounters = []
            if 'context' in chatCompletion:
                for doc_index, doc in  enumerate(chatCompletion["context"], start=1):
                    filepath = doc.metadata.get('filepath', '')
                    url = doc.metadata.get('url', '')
                    title = doc.metadata.get('title', '')
                    page = doc.metadata.get('page', '')
                    content = doc.page_content
                    
                    parsed_data["citations"].append({
                        "content": content,
                        "title": title,
                        "url": url,
                        "filepath": filepath,
                        "chunk_id": str(page)
                    })
                    docCounters.append(doc_index)
                parsed_data["intent"]= chatCompletion['input']
                response_obj["choices"][0]["messages"].append(
                    {
                        "role": "tool",
                        "content": json.dumps(parsed_data),
                    }
                )
            counter_string = ' '.join([f'[doc{doc}]' for doc in docCounters]) if context_present else ""
            result = chatCompletion["answer"].replace("┐", "")

            messageObj = {
                "role": "assistant",
                "content": result + counter_string,
            }
            response_obj["choices"][0]["messages"].append(messageObj)
            return response_obj

    return {}

def format_streaming_response_langchain(chatCompletionChunk, history_metadata, last_message):
    """Formats the response object for a chat completion chunk.
    
    Args:
        chatCompletionChunk: The chat completion chunk object.
        history_metadata: The history metadata to include in the response.
        apim_request_id: The APIM request ID to include in the response.
    
    Returns:
        A formatted response object containing the chat completion chunk details, history metadata, and APIM request ID.
    """
    timestamp = int(time.time())
    formatted_date = int(timestamp)
    id = str(uuid.uuid4())
    parsed_data = {"citations": [],"intent": ""}

    response_obj = {
        "id": id,
        "model": os.environ.get("AZURE_OPENAI_MODEL"),
        "created": formatted_date,
        "object": "extensions.chat.completion",
        "choices": [{"messages": []}],
        "history_metadata": history_metadata,
        "apim-request-id": id,
    }

    if len(chatCompletionChunk) > 0:
        if context_chunk := chatCompletionChunk.get("context"):
            for doc in  context_chunk:
                filepath = doc.metadata.get('filepath', '')
                url = doc.metadata.get('url', '')
                title = doc.metadata.get('title', '')
                page = doc.metadata.get('page', '')
                page_label = doc.metadata.get('page_label', '')
                content = doc.page_content
                
                parsed_data["citations"].append({
                    "content": content,
                    "title": title,
                    "url": url,
                    "filepath": filepath,
                    "page_label": page_label,
                    "page_index": page,
                    "chunk_id": str(page)
                })
                
            parsed_data["intent"]= last_message
            response_obj["choices"][0]["messages"].append(
                    {
                        "role": "tool",
                        "content": json.dumps(parsed_data),
                    }
            )
            return response_obj
        
        if answer_chunk := chatCompletionChunk.get("answer"):
            context_present = "┐" in answer_chunk
            counter_string = ' '.join([f'[doc{doc}]' for doc in range(1, 5)]) if context_present else ""
            messageObj = {
                "role": "assistant",
                "content": answer_chunk.replace("┐", "") + counter_string,
            }
            response_obj["choices"][0]["messages"].append(messageObj)
            return response_obj
        

    return {}

def format_stream_response(chatCompletionChunk, history_metadata, apim_request_id):
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

def format_pf_non_streaming_response(
    chatCompletion, history_metadata, response_field_name, citations_field_name, message_uuid=None
):
    """Formats the non-streaming response from Promptflow API.
    
    Args:
        chatCompletion (dict): The response object received from Promptflow API.
        history_metadata (dict): Metadata related to the conversation history.
        response_field_name (str): The key in chatCompletion dict containing the response message.
        citations_field_name (str): The key in chatCompletion dict containing the citations.
        message_uuid (str, optional): The unique identifier for the message.
    
    Returns:
        dict: Formatted response object with messages, history metadata, and other details.
    """
    if chatCompletion is None:
        logging.error(
            "chatCompletion object is None - Increase PROMPTFLOW_RESPONSE_TIMEOUT parameter"
        )
        return {
            "error": "No response received from promptflow endpoint increase PROMPTFLOW_RESPONSE_TIMEOUT parameter or check the promptflow endpoint."
        }
    if "error" in chatCompletion:
        logging.error(f"Error in promptflow response api: {chatCompletion['error']}")
        return {"error": chatCompletion["error"]}

    logging.debug(f"chatCompletion: {chatCompletion}")
    try:
        messages = []
        if response_field_name in chatCompletion:
            messages.append({
                "role": "assistant",
                "content": chatCompletion[response_field_name] 
            })
        if citations_field_name in chatCompletion:
            messages.append({ 
                "role": "tool",
                "content": chatCompletion[citations_field_name]
            })
        response_obj = {
            "id": chatCompletion["id"],
            "model": "",
            "created": "",
            "object": "",
            "choices": [
                {
                    "messages": messages,
                    "history_metadata": history_metadata,
                }
            ]
        }
        return response_obj
    except Exception as e:
        logging.error(f"Exception in format_pf_non_streaming_response: {e}")
        return {}


def convert_to_pf_format(input_json, request_field_name, response_field_name):
    """Converts input JSON to Promptflow format.
    
    Args:
        input_json (dict): The input JSON to be converted.
        request_field_name (str): The field name for user input in the output JSON.
        response_field_name (str): The field name for assistant response in the output JSON.
    
    Returns:
        list: The output JSON in Promptflow format.
    """
    output_json = []
    logging.debug(f"Input json: {input_json}")
    # align the input json to the format expected by promptflow chat flow
    for message in input_json["messages"]:
        if message:
            if message["role"] == "user":
                new_obj = {
                    "inputs": {request_field_name: message["content"]},
                    "outputs": {response_field_name: ""},
                }
                output_json.append(new_obj)
            elif message["role"] == "assistant" and len(output_json) > 0:
                output_json[-1]["outputs"][response_field_name] = message["content"]
    logging.debug(f"PF formatted response: {output_json}")
    return output_json
