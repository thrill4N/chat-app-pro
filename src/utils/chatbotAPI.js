// ChatGPT API integration utilities
import { CHATBOT, ERROR_MESSAGES } from './constants';

/**
 * Send message to ChatGPT API and get response
 * @param {string} message - User's message
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<string>} AI response
 */
export const getChatGPTResponse = async (message, conversationHistory = []) => {
  try {
    const apiKey = process.env.REACT_APP_CHATGPT_API_KEY;
    
    if (!apiKey) {
      console.error('ChatGPT API key is not configured');
      return "I'm sorry, but the ChatGPT API key hasn't been configured yet. Please check the environment variables.";
    }

    // Prepare messages for API call
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant named ChatGPT. You are friendly, knowledgeable, and conversational. Keep responses concise but informative.'
      },
      ...conversationHistory.map(msg => ({
        role: msg.senderId === CHATBOT.ID ? 'assistant' : 'user',
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const response = await fetch(CHATBOT.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: CHATBOT.MODEL,
        messages: messages,
        max_tokens: CHATBOT.MAX_TOKENS,
        temperature: CHATBOT.TEMPERATURE,
        presence_penalty: 0.6,
        frequency_penalty: 0.5
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('ChatGPT API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "I'm not sure how to respond to that.";
    
    return aiResponse;
  } catch (error) {
    console.error('Error calling ChatGPT API:', error);
    throw new Error(ERROR_MESSAGES.AI_RESPONSE_FAILED);
  }
};

/**
 * Stream ChatGPT response (for real-time typing effect)
 * @param {string} message - User's message
 * @param {Array} conversationHistory - Previous messages
 * @param {Function} onChunk - Callback for each chunk of response
 * @returns {Promise<void>}
 */
export const streamChatGPTResponse = async (message, conversationHistory, onChunk) => {
  try {
    const apiKey = process.env.REACT_APP_CHATGPT_API_KEY;
    
    if (!apiKey) {
      onChunk("I'm sorry, but the ChatGPT API key hasn't been configured yet.");
      return;
    }

    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant named ChatGPT.'
      },
      ...conversationHistory.map(msg => ({
        role: msg.senderId === CHATBOT.ID ? 'assistant' : 'user',
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const response = await fetch(CHATBOT.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: CHATBOT.MODEL,
        messages: messages,
        max_tokens: CHATBOT.MAX_TOKENS,
        temperature: CHATBOT.TEMPERATURE,
        stream: true
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const jsonData = JSON.parse(line.slice(6));
            const content = jsonData.choices[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              onChunk(content);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    return fullResponse;
  } catch (error) {
    console.error('Error streaming ChatGPT response:', error);
    onChunk("I apologize, but I'm having trouble responding right now. Please try again in a moment.");
  }
};

/**
 * Generate a unique ID for chatbot conversations
 * @param {string} userId - User ID
 * @returns {string} Conversation ID
 */
export const getChatbotConversationId = (userId) => {
  return `${userId}_${CHATBOT.ID}`;
};

/**
 * Check if a conversation is with the chatbot
 * @param {string} otherUserId - Other user ID
 * @returns {boolean} True if conversation is with chatbot
 */
export const isChatbotConversation = (otherUserId) => {
  return otherUserId === CHATBOT.ID;
};