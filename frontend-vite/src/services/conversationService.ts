import type { ConversationRequest, ChatResponse } from '../models';

/**
 * Conversation API Service
 * Handles communication with the AI backend for chat completions
 */

const API_BASE_URL = "https://racmc-gpt-dev-func-backend.azurewebsites.net/api";

/**
 * Send a conversation request to the AI API
 * 
 * @param request - The conversation request containing messages
 * @param abortSignal - AbortSignal for cancelling the request
 * @returns Promise with the Response (streaming)
 */
export async function conversationApi(
    request: ConversationRequest,
    abortSignal: AbortSignal
): Promise<Response> {
    console.log('Sending conversation request:', request);
    const response = await fetch(`/api/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context: request }),
        signal: abortSignal,
    });

    return response;
}

/**
 * Parse streaming response chunks
 */
export function parseStreamingResponse(text: string): ChatResponse | null {
    try {
        if (text !== '' && text !== '{}') {
            return JSON.parse(text) as ChatResponse;
        }
    } catch (e) {
        if (!(e instanceof SyntaxError)) {
            console.error('Error parsing response:', e);
            throw e;
        }
        // Incomplete message, will be completed in next chunk
    }
    return null;
}
