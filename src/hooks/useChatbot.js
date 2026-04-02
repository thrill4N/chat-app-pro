// Custom hook for managing chatbot interactions
import { useState, useCallback } from 'react';
import { db } from '../utils/firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { CHATBOT, ERROR_MESSAGES } from '../utils/constants';
import toast from 'react-hot-toast';

/**
 * Custom hook for chatbot functionality
 * @param {string} currentUserId - Current user ID
 * @returns {Object} Chatbot state and methods
 */
export const useChatbot = (currentUserId) => {
  const [isThinking, setIsThinking] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');

  /**
   * Get conversation history with chatbot
   * @param {number} limitCount - Number of messages to fetch
   * @returns {Promise<Array>} Conversation history
   */
  const getChatbotHistory = useCallback(async (limitCount = 20) => {
    if (!currentUserId) return [];

    try {
      const conversationId = `${currentUserId}_${CHATBOT.ID}`;
      const messagesRef = collection(db, 'messages');
      const q = query(
        messagesRef,
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const messages = [];
      querySnapshot.forEach((doc) => {
        messages.unshift({ id: doc.id, ...doc.data() });
      });

      return messages;
    } catch (error) {
      console.error('Error fetching chatbot history:', error);
      return [];
    }
  }, [currentUserId]);

  /**
   * Send message to chatbot and get AI response
   * Note: This is a mock function. For real AI, integrate with OpenAI API
   * @param {string} message - User's message
   * @returns {Promise<Object>} AI response message
   */
  const sendToChatbot = useCallback(async (message) => {
    if (!currentUserId) {
      toast.error('Please login to chat with AI');
      return null;
    }

    setIsThinking(true);

    try {
      // Save user message to Firestore
      const conversationId = `${currentUserId}_${CHATBOT.ID}`;
      const messagesRef = collection(db, 'messages');
      
      // Save user message
      const userMessage = {
        conversationId,
        senderId: currentUserId,
        receiverId: CHATBOT.ID,
        content: message,
        type: 'text',
        timestamp: serverTimestamp(),
        read: true
      };
      
      await addDoc(messagesRef, userMessage);
      
      // Simulate AI response (for demo purposes)
      // Replace this with actual API call to OpenAI
      const mockResponses = [
        "That's interesting! Tell me more about that.",
        "I understand what you're saying. How can I help you further?",
        "Great question! Based on my knowledge, I'd suggest...",
        "Thanks for sharing! Is there anything specific you'd like to know?",
        "I'm here to help! What else would you like to discuss?",
        "That's a fascinating topic. Let me think about that...",
        "I appreciate your message. How can I assist you today?",
        "Thanks for reaching out! I'm always here to help with any questions."
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const aiResponseText = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      
      // Save AI response
      const aiMessage = {
        conversationId,
        senderId: CHATBOT.ID,
        receiverId: currentUserId,
        content: aiResponseText,
        type: 'ai_response',
        timestamp: serverTimestamp(),
        read: true
      };
      
      const aiMessageDoc = await addDoc(messagesRef, aiMessage);
      
      setIsThinking(false);
      
      return {
        id: aiMessageDoc.id,
        ...aiMessage,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error in chatbot interaction:', error);
      setIsThinking(false);
      toast.error(ERROR_MESSAGES.AI_RESPONSE_FAILED);
      
      // Return error message
      return {
        id: 'error_' + Date.now(),
        senderId: CHATBOT.ID,
        receiverId: currentUserId,
        content: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        type: 'ai_response',
        timestamp: new Date(),
        isError: true
      };
    }
  }, [currentUserId]);

  /**
   * Initialize chatbot user in Firestore (if not exists)
   * @returns {Promise<void>}
   */
  const initializeChatbotUser = useCallback(async () => {
    try {
      const chatbotRef = doc(db, 'users', CHATBOT.ID);
      const chatbotDoc = await getDoc(chatbotRef);
      
      if (!chatbotDoc.exists()) {
        await setDoc(chatbotRef, {
          uid: CHATBOT.ID,
          displayName: CHATBOT.NAME,
          email: CHATBOT.EMAIL,
          photoURL: CHATBOT.AVATAR,
          status: 'online',
          isBot: true,
          description: CHATBOT.DESCRIPTION,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('Chatbot user initialized');
      }
    } catch (error) {
      console.error('Error initializing chatbot user:', error);
    }
  }, []);

  return {
    isThinking,
    streamingResponse,
    sendToChatbot,
    getChatbotHistory,
    initializeChatbotUser,
    isChatbot: true
  };
};