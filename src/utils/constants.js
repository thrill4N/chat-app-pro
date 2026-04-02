// Application constants and configuration and chatbot intergration

// Application constants and configuration

// Message limits and constraints
export const MAX_MESSAGE_LENGTH = parseInt(process.env.REACT_APP_MAX_MESSAGE_LENGTH) || 500;
export const TYPING_TIMEOUT = parseInt(process.env.REACT_APP_TYPING_TIMEOUT) || 3000;
export const MESSAGES_PER_PAGE = 50;

// User status types
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away'
};

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  AI_RESPONSE: 'ai_response'
};

// Collection names for Firestore
export const COLLECTIONS = {
  USERS: 'users',
  MESSAGES: 'messages',
  CONVERSATIONS: 'conversations',
  TYPING: 'typing'
};

// Error messages
export const ERROR_MESSAGES = {
  AUTH_FAILED: 'Authentication failed. Please try again.',
  SEND_MESSAGE_FAILED: 'Failed to send message. Please check your connection.',
  LOAD_MESSAGES_FAILED: 'Failed to load messages. Please refresh the page.',
  UPLOAD_FAILED: 'Failed to upload file. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  AI_RESPONSE_FAILED: 'Failed to get AI response. Please try again.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Welcome back!',
  LOGOUT_SUCCESS: 'Logged out successfully',
  MESSAGE_SENT: 'Message sent',
  PROFILE_UPDATED: 'Profile updated successfully'
};

// Chatbot Constants
export const CHATBOT = {
  ID: 'chatgpt_bot',
  NAME: 'ChatGPT AI Assistant',
  EMAIL: 'chatgpt@chatbot.ai',
  AVATAR: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
  DESCRIPTION: 'I\'m ChatGPT, your AI assistant! I can help answer questions, have conversations, and assist with various tasks.',
  WELCOME_MESSAGE: 'Hello! 👋 I\'m ChatGPT, your AI assistant. Feel free to ask me anything, and I\'ll do my best to help!',
  API_ENDPOINT: process.env.REACT_APP_CHATGPT_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions',
  MODEL: process.env.REACT_APP_CHATGPT_MODEL || 'gpt-3.5-turbo',
  MAX_TOKENS: parseInt(process.env.REACT_APP_CHATGPT_MAX_TOKENS) || 500,
  TEMPERATURE: parseFloat(process.env.REACT_APP_CHATGPT_TEMPERATURE) || 0.7
};

// Helper function to check if conversation is with chatbot
export const isChatbotConversation = (userId) => {
  return userId === CHATBOT.ID;
};